import { action, computed, flow, makeObservable, observable } from 'mobx';

import { type ApiConfig, type ApiResult, type ApiType } from '../types/ApiType';
import { handleError } from '../utils/api';
import { invokeEndpoint } from '../utils/api/apiCall';
import {
  abortReason,
  createStaleResult,
  type StaleReason,
  type StaleResult,
  toApiError,
} from '../utils/api/stale';
import type { ApiMethodArgs, ApiMethodName } from '../utils/api/types/ApiMethod.type';
import { actionBoundCompat } from '../utils/mobx/actionBoundCompat';
import { LoadingStore } from './LoadingStore';

/**
 * Options for {@link ApiStore.apiCall}.
 *
 * A call is *stale* when a newer call with the same `exclusiveKey` started, when its
 * `signal` was aborted, or when it failed and `isStale(error)` returned `true`.
 * A stale call never runs `apply` and never logs through `handleError`. How it settles
 * depends on `staleResult`:
 * - default: a stale success resolves with its (unapplied) response, and a stale failure
 *   rejects with the same `Error` that `handleError` would throw (the original error is
 *   its `cause`), as in 2.0;
 * - `'marker'`: the call resolves with a {@link StaleResult} (check it with
 *   `isStaleResult`) and never rejects.
 */
export type ApiCallOptions = {
  /** Skips loading-state changes, for example during background prefetch. */
  disableLoading?: boolean;
  /** Applies the successful result. Never runs for a stale call. */
  apply?: (result: unknown) => void;
  /**
   * Last-call-wins scope: starting a call with this key makes every earlier call with the
   * same key stale.
   */
  exclusiveKey?: string;
  /** Overrides the loading scope resolved by {@link ApiStore.getLoadingKey}. */
  loadingKey?: string;
  /**
   * Aborts the call. Forwarded to the endpoint as its second argument (`{ signal }`, the
   * `initOverrides` of generated clients). Once aborted, the call is stale
   * (`reason: 'aborted'`), whether the request fails or not. An already aborted signal
   * skips the request.
   */
  signal?: AbortSignal;
  /**
   * Marks a failure as stale (`reason: 'dropped'`), for example when the app aborted the
   * request itself. Receives the original, unwrapped error.
   */
  isStale?: (error: unknown) => boolean;
  /**
   * Opt-in: with `'marker'`, a stale call resolves with a {@link StaleResult} instead of
   * its response or a rejection, and the result type includes `StaleResult`.
   */
  staleResult?: 'marker';
};

/**
 * Promise returned by a MobX `flow`. Declared locally because MobX 6 does not export
 * `CancellablePromise` from its entry point.
 */
type CancellablePromise<T> = Promise<T> & { cancel(): void };

/**
 * Call signature of {@link ApiStore.apiCall}. Only calls with `staleResult: 'marker'` may
 * resolve with a {@link StaleResult}; all other calls keep the result type.
 */
export type ApiCallMethod<TApi extends ApiType> = {
  <
    Api extends ApiType = TApi,
    Endpoint extends ApiMethodName<Api> = ApiMethodName<Api>,
    Args extends ApiMethodArgs<Api, Endpoint> = ApiMethodArgs<Api, Endpoint>,
  >(
    endpoint: Endpoint,
    args: Args extends undefined ? never : Args,
    options?: ApiCallOptions & { staleResult?: undefined },
  ): CancellablePromise<ApiResult<Api, Endpoint>>;
  <
    Api extends ApiType = TApi,
    Endpoint extends ApiMethodName<Api> = ApiMethodName<Api>,
    Args extends ApiMethodArgs<Api, Endpoint> = ApiMethodArgs<Api, Endpoint>,
  >(
    endpoint: Endpoint,
    args: Args extends undefined ? never : Args,
    options: ApiCallOptions & { staleResult: 'marker' },
  ): CancellablePromise<ApiResult<Api, Endpoint> | StaleResult>;
};

/**
 * Base MobX store that owns an API client and runs typed endpoint calls.
 * Initialize it with a constructor factory or override {@link initApi} in a subclass.
 */
export class ApiStore<
  TApi extends ApiType,
  TConfig extends ApiConfig<TApi> = ApiConfig<TApi>,
> extends LoadingStore {
  /** API client instance, or `null` until initialization completes. */
  api: TApi | null = null;

  private createApi: ((config: TConfig) => TApi) | null = null;

  #apiCallGenerations = new Map<string, number>();

  #lastApiCallGeneration = 0;

  /** Store name used for errors and diagnostics. */
  name: string;

  /** Creates a store from a name or API factory options. */
  constructor(
    nameOrOptions?: string | { name?: string; createApi?: (config: TConfig) => TApi },
  ) {
    super();

    // Handle backwards compatibility and flexible constructor signatures
    if (typeof nameOrOptions === 'string') {
      // Legacy signature: constructor(name: string)
      this.name = nameOrOptions;
      this.createApi = null;
    } else if (nameOrOptions && typeof nameOrOptions === 'object') {
      // New signature: constructor({ name?, createApi? })
      this.name = nameOrOptions.name ?? this.constructor.name;
      this.createApi = nameOrOptions.createApi ?? null;
    } else {
      // No arguments provided
      this.name = this.constructor.name;
      this.createApi = null;
    }

    makeObservable(this, {
      // Prefer bound actions (MobX 6: action.bound, MobX 7: actionBound) so
      // prototype methods keep `this` when used as callbacks.
      initApi: actionBoundCompat,
      setApi: action,
      apiIsSet: computed,
      api: observable,
      name: false,
      apiCall: flow,
    });

    // Typically starts loading until config arrives / initApi runs.
    this.setIsLoading(true);
  }

  /** Attaches the API client and clears all loading state. */
  setApi = (api: TApi) => {
    this.api = api;
    // Absolute clear for init/reconfigure. Do not call while apiCalls are in flight
    // unless you intend to drop loading indicators for those requests.
    this.setIsLoading(false);
  };

  /**
   * Initializes the client through the configured factory.
   * Override this method when initialization requires custom logic.
   */
  initApi(config: TConfig) {
    if (this.createApi) {
      this.setApi(this.createApi(config));
    } else {
      throw new Error(
        `initApi is not implemented for ${this.name}. Either provide a 'createApi' function in the constructor options or override the 'initApi' method in your subclass.`,
      );
    }
  }

  /** Whether an API client is initialized. */
  get apiIsSet() {
    return this.api !== null;
  }

  /**
   * Resolves the loading scope for an API call.
   * Override to include arguments such as an entity ID.
   */
  getLoadingKey(endpoint: PropertyKey, _args: unknown): string {
    return String(endpoint);
  }

  /**
   * Starts a new generation for an exclusive key and returns it. Every earlier call with the
   * same key becomes stale. Pair it with {@link isApiCallCurrent} to guard custom requests.
   */
  beginExclusiveCall(exclusiveKey: string): number {
    // One counter for all keys, so a pruned key never reuses a pending generation.
    this.#lastApiCallGeneration += 1;
    const generation = this.#lastApiCallGeneration;
    this.#apiCallGenerations.set(exclusiveKey, generation);
    return generation;
  }

  /** Whether a generation is still latest for an exclusive key. */
  isApiCallCurrent(exclusiveKey: string, generation: number) {
    return this.#apiCallGenerations.get(exclusiveKey) === generation;
  }

  /**
   * Calls a typed endpoint with keyed loading and optional latest-only result application.
   * Throws when the API client has not been initialized. Failures that are not stale reject
   * with the error from `handleError` (the original error is its `cause`).
   * See {@link ApiCallOptions} for stale and aborted calls.
   */
  apiCall: ApiCallMethod<TApi> = flow(function* (
    this: ApiStore<TApi, TConfig>,
    endpoint: PropertyKey,
    args: unknown,
    {
      disableLoading = false,
      apply,
      exclusiveKey,
      loadingKey,
      signal,
      isStale,
      staleResult,
    }: ApiCallOptions = {},
  ) {
    const generation =
      exclusiveKey === undefined ? undefined : this.beginExclusiveCall(exclusiveKey);
    const staleReason = (): StaleReason | undefined => {
      if (
        exclusiveKey !== undefined &&
        generation !== undefined &&
        !this.isApiCallCurrent(exclusiveKey, generation)
      ) {
        return 'superseded';
      }
      return signal?.aborted ? 'aborted' : undefined;
    };
    const resolvedLoadingKey = loadingKey ?? this.getLoadingKey(endpoint, args);
    const loadingTicket = disableLoading ? null : this.beginLoading(resolvedLoadingKey);
    try {
      if (!this.api) throw new Error(`${this.name} Api is not set`);
      if (signal?.aborted) {
        const error = abortReason(signal);
        if (staleResult === 'marker') return createStaleResult('aborted', error);
        return (yield toApiError(error)) as never;
      }
      let result: unknown;
      try {
        result = yield invokeEndpoint(
          endpoint as never,
          args as never,
          this.api,
          signal ? { signal } : undefined,
        );
      } catch (error) {
        const reason = staleReason() ?? (isStale?.(error) ? 'dropped' : undefined);
        if (!reason) return (yield handleError(error)) as never;
        if (staleResult === 'marker') return createStaleResult(reason, error);
        // Same rejection as before, without the handleError log.
        return (yield toApiError(error)) as never;
      }
      const reason = staleReason();
      if (reason) return staleResult === 'marker' ? createStaleResult(reason) : result;
      apply?.(result);
      return result;
    } finally {
      if (loadingTicket) this.endLoading(loadingTicket);
      if (
        exclusiveKey !== undefined &&
        generation !== undefined &&
        this.isApiCallCurrent(exclusiveKey, generation)
      ) {
        this.#apiCallGenerations.delete(exclusiveKey);
      }
    }
  });
}
