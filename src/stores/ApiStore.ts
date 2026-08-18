import { action, computed, flow, makeObservable, observable } from 'mobx';

import { type ApiConfig, type ApiType } from '../types/ApiType';
import { callApi } from '../utils/api';
import type { ApiMethodArgs, ApiMethodName } from '../utils/api/types/ApiMethod.type';
import { actionBoundCompat } from '../utils/mobx/actionBoundCompat';
import { LoadingStore } from './LoadingStore';

/** Options for {@link ApiStore.apiCall}. */
export type ApiCallOptions = {
  /** Skips loading-state changes, for example during background prefetch. */
  disableLoading?: boolean;
  /** Applies each successful result, or only the latest one when `exclusiveKey` is set. */
  apply?: (result: unknown) => void;
  /** Limits `apply` to the latest call started with this key. */
  exclusiveKey?: string;
  /** Overrides the loading scope resolved by {@link ApiStore.getLoadingKey}. */
  loadingKey?: string;
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

  /** Whether a generation is still latest for an exclusive key. */
  isApiCallCurrent(exclusiveKey: string, generation: number) {
    return this.#apiCallGenerations.get(exclusiveKey) === generation;
  }

  /**
   * Calls a typed endpoint with keyed loading and optional latest-only result application.
   * Throws when the API client has not been initialized.
   */
  apiCall = flow(function* <
    Api extends ApiType = TApi,
    Endpoint extends ApiMethodName<Api> = ApiMethodName<Api>,
    Args extends ApiMethodArgs<Api, Endpoint> = ApiMethodArgs<Api, Endpoint>,
  >(
    this: ApiStore<TApi, TConfig>,
    endpoint: Endpoint,
    args: Args extends undefined ? never : Args,
    { disableLoading = false, apply, exclusiveKey, loadingKey }: ApiCallOptions = {},
  ) {
    let generation: number | undefined;
    if (exclusiveKey !== undefined) {
      generation = (this.#apiCallGenerations.get(exclusiveKey) ?? 0) + 1;
      this.#apiCallGenerations.set(exclusiveKey, generation);
    }
    const resolvedLoadingKey = loadingKey ?? this.getLoadingKey(endpoint, args);
    const loadingTicket = disableLoading ? null : this.beginLoading(resolvedLoadingKey);
    try {
      if (!this.api) throw new Error(`${this.name} Api is not set`);
      const result = (yield callApi<Api, Endpoint, Args>(
        endpoint,
        args,
        this.api as unknown as Api,
      )) as unknown as Awaited<ReturnType<Api[Endpoint & keyof Api]>>;
      if (apply) {
        const shouldApply =
          exclusiveKey === undefined ||
          (generation !== undefined && this.isApiCallCurrent(exclusiveKey, generation));
        if (shouldApply) apply(result);
      }
      return result;
    } finally {
      if (loadingTicket) this.endLoading(loadingTicket);
    }
  });
}
