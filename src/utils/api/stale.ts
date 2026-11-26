import { getErrorMessage } from './getErrorMessage';

/**
 * Why a call was treated as stale:
 * - `superseded`: a newer call with the same `exclusiveKey` started.
 * - `aborted`: the call's `signal` was aborted.
 * - `dropped`: the call's `isStale(error)` hook returned `true`.
 */
export type StaleReason = 'superseded' | 'aborted' | 'dropped';

const STALE_RESULT_MARKER = '__mobxOpenApiStoresStale__';

/**
 * Value a stale `apiCall` resolves with instead of its response or a rejection.
 * Check it with {@link isStaleResult}; never apply it to store state.
 */
export type StaleResult = {
  readonly [STALE_RESULT_MARKER]: true;
  /** Why the call is stale. */
  readonly reason: StaleReason;
  /** The original (unwrapped) error, when the stale call failed. */
  readonly error?: unknown;
};

/** Creates a {@link StaleResult}. */
export const createStaleResult = (reason: StaleReason, error?: unknown): StaleResult =>
  Object.freeze(
    error === undefined
      ? { [STALE_RESULT_MARKER]: true as const, reason }
      : { [STALE_RESULT_MARKER]: true as const, reason, error },
  );

/**
 * Whether a value is the {@link StaleResult} of a stale `apiCall`.
 *
 * @example
 * const result = await store.apiCall('listPets', {}, { exclusiveKey: 'list' });
 * if (isStaleResult(result)) return; // a newer call owns the state
 */
export const isStaleResult = (value: unknown): value is StaleResult =>
  typeof value === 'object' &&
  value !== null &&
  (value as Record<string, unknown>)[STALE_RESULT_MARKER] === true;

/**
 * Whether an error is, or was caused by, an `AbortError`.
 * Walks the `cause` chain, so it also recognises errors wrapped by `handleError`.
 */
export const isAbortError = (error: unknown): boolean => {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (typeof current === 'object' && current !== null && !seen.has(current)) {
    seen.add(current);
    if ((current as { name?: unknown }).name === 'AbortError') return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
};

/**
 * Rejects with the same `Error` that `handleError` throws, without logging.
 * @internal
 */
export const toApiError = async (error: unknown): Promise<never> => {
  throw new Error(await getErrorMessage(error), { cause: error });
};

/**
 * The reason of an aborted signal, or an `AbortError` when it has none.
 * @internal
 */
export const abortReason = (signal: AbortSignal): unknown =>
  (signal.reason as unknown) ??
  new DOMException('The operation was aborted.', 'AbortError');
