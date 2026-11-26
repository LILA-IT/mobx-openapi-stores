import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ApiType } from '../../types';
import { isAbortError, isStaleResult } from '../../utils/api';
import { ApiStore } from '../ApiStore';

type TestApi = ApiType & {
  getValue: (
    request: { key: string },
    init?: { signal?: AbortSignal },
  ) => Promise<string>;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createSequencedStore(deferreds: Deferred<string>[]) {
  let callCount = 0;
  const getValue = vi.fn(() => {
    const deferred = deferreds.at(callCount);
    callCount += 1;
    if (!deferred) throw new Error('Unexpected call');
    return deferred.promise;
  });
  const store = new ApiStore<TestApi>('StaleTestStore');
  store.setApi({ getValue });
  return { store, getValue };
}

const abortError = () => new DOMException('The operation was aborted.', 'AbortError');

describe('ApiStore stale and aborted calls (staleResult: marker)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves a superseded success that settles last with a stale result and keeps the newer data', async () => {
    const older = createDeferred<string>();
    const newer = createDeferred<string>();
    const { store } = createSequencedStore([older, newer]);
    const applied: unknown[] = [];
    const options = {
      exclusiveKey: 'list',
      staleResult: 'marker' as const,
      apply: (result: unknown) => applied.push(result),
    };

    const olderCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      options,
    );
    const newerCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'ab' },
      options,
    );

    newer.resolve('value:ab');
    await expect(newerCall).resolves.toBe('value:ab');
    older.resolve('value:a');
    const olderResult = await olderCall;

    expect(isStaleResult(olderResult)).toBe(true);
    expect(olderResult).toMatchObject({ reason: 'superseded' });
    expect(applied).toEqual(['value:ab']);
    expect(store.isLoading).toBe(false);
  });

  it('resolves a superseded failure that settles last without rejecting or logging', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const older = createDeferred<string>();
    const newer = createDeferred<string>();
    const { store } = createSequencedStore([older, newer]);
    const applied: unknown[] = [];
    const options = {
      exclusiveKey: 'list',
      staleResult: 'marker' as const,
      apply: (result: unknown) => applied.push(result),
    };

    const olderCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      options,
    );
    const newerCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'ab' },
      options,
    );

    newer.resolve('value:ab');
    await newerCall;
    const failure = new Error('older request failed');
    older.reject(failure);
    const olderResult = await olderCall;

    expect(isStaleResult(olderResult)).toBe(true);
    expect(olderResult).toMatchObject({ reason: 'superseded', error: failure });
    expect(applied).toEqual(['value:ab']);
    expect(consoleError).not.toHaveBeenCalled();
    expect(store.isLoading).toBe(false);
  });

  it('still rejects the latest exclusive call when it fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const only = createDeferred<string>();
    const { store } = createSequencedStore([only]);

    const call = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      { exclusiveKey: 'list' },
    );
    only.reject(new Error('latest failed'));

    await expect(call).rejects.toThrow('latest failed');
  });

  it('forwards signal to the endpoint and resolves an aborted call without error state', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const pending = createDeferred<string>();
    const { store, getValue } = createSequencedStore([pending]);
    const controller = new AbortController();
    const apply = vi.fn();

    const call = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      { signal: controller.signal, apply, staleResult: 'marker' },
    );
    expect(getValue).toHaveBeenCalledWith({ key: 'a' }, { signal: controller.signal });
    expect(store.isLoading).toBe(true);

    controller.abort();
    pending.reject(abortError());
    const result = await call;

    expect(isStaleResult(result)).toBe(true);
    expect(result).toMatchObject({ reason: 'aborted' });
    expect(apply).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(store.isLoading).toBe(false);
  });

  it('does not call the endpoint when the signal is already aborted', async () => {
    const { store, getValue } = createSequencedStore([]);
    const controller = new AbortController();
    controller.abort();

    const result = await store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      { signal: controller.signal, staleResult: 'marker' },
    );

    expect(isStaleResult(result)).toBe(true);
    expect(getValue).not.toHaveBeenCalled();
    expect(store.isLoading).toBe(false);
  });

  it('calls the endpoint with the request only when no signal is given', async () => {
    const only = createDeferred<string>();
    const { store, getValue } = createSequencedStore([only]);
    only.resolve('value:a');

    await store.apiCall<TestApi, 'getValue', { key: string }>('getValue', { key: 'a' });

    expect(getValue.mock.calls[0]).toEqual([{ key: 'a' }]);
  });

  it('drops errors marked stale by isStale and passes the original error to the hook', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const pending = createDeferred<string>();
    const { store } = createSequencedStore([pending]);
    class SessionEndedError extends Error {}
    const marked = new Error('fetch funnel aborted', { cause: new SessionEndedError() });
    const isStale = vi.fn(
      (error: unknown) =>
        error instanceof Error && error.cause instanceof SessionEndedError,
    );

    const call = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      { isStale, staleResult: 'marker' },
    );
    pending.reject(marked);
    const result = await call;

    expect(isStale).toHaveBeenCalledWith(marked);
    expect(isStaleResult(result)).toBe(true);
    expect(result).toMatchObject({ reason: 'dropped', error: marked });
    expect(consoleError).not.toHaveBeenCalled();
    expect(store.isLoading).toBe(false);
  });

  it('keeps the error identity of a failure that is not stale', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const pending = createDeferred<string>();
    const { store } = createSequencedStore([pending]);
    const original = abortError();

    const call = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      { isStale: () => false },
    );
    pending.reject(original);

    const error: unknown = await call.then(
      () => undefined,
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).cause).toBe(original);
    expect(isAbortError(error)).toBe(true);
    expect(isAbortError(new Error('plain', { cause: new Error('inner') }))).toBe(false);
  });

  it('isStaleResult rejects ordinary values', () => {
    expect(isStaleResult(undefined)).toBe(false);
    expect(isStaleResult(null)).toBe(false);
    expect(isStaleResult({ reason: 'superseded' })).toBe(false);
    expect(isStaleResult('value')).toBe(false);
  });
});

describe('ApiStore stale calls with the default contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves a superseded success with its response but does not apply it', async () => {
    const older = createDeferred<string>();
    const newer = createDeferred<string>();
    const { store } = createSequencedStore([older, newer]);
    const applied: unknown[] = [];
    const options = {
      exclusiveKey: 'list',
      apply: (result: unknown) => applied.push(result),
    };

    const olderCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      options,
    );
    const newerCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'ab' },
      options,
    );
    newer.resolve('value:ab');
    await newerCall;
    older.resolve('value:a');

    await expect(olderCall).resolves.toBe('value:a');
    expect(applied).toEqual(['value:ab']);
    expect(store.isLoading).toBe(false);
  });

  it('rejects a superseded failure as before, but without logging or applying', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const older = createDeferred<string>();
    const newer = createDeferred<string>();
    const { store } = createSequencedStore([older, newer]);
    const applied: unknown[] = [];
    const options = {
      exclusiveKey: 'list',
      apply: (result: unknown) => applied.push(result),
    };

    const olderCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      options,
    );
    const newerCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'ab' },
      options,
    );
    newer.resolve('value:ab');
    await newerCall;
    const failure = new Error('older request failed');
    older.reject(failure);

    await expect(olderCall).rejects.toMatchObject({
      message: 'older request failed',
      cause: failure,
    });
    expect(applied).toEqual(['value:ab']);
    expect(consoleError).not.toHaveBeenCalled();
    expect(store.isLoading).toBe(false);
  });

  it('rejects an aborted call with an AbortError cause, without logging', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const pending = createDeferred<string>();
    const { store } = createSequencedStore([pending]);
    const controller = new AbortController();

    const call = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      { signal: controller.signal },
    );
    controller.abort();
    pending.reject(abortError());

    const error: unknown = await call.then(
      () => undefined,
      (reason: unknown) => reason,
    );
    expect(isAbortError(error)).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
    expect(store.isLoading).toBe(false);
  });

  it('rejects without a request when the signal is already aborted', async () => {
    const { store, getValue } = createSequencedStore([]);
    const controller = new AbortController();
    controller.abort();

    const error: unknown = await store
      .apiCall<TestApi, 'getValue', { key: string }>(
        'getValue',
        { key: 'a' },
        { signal: controller.signal },
      )
      .then(
        () => undefined,
        (reason: unknown) => reason,
      );

    expect(isAbortError(error)).toBe(true);
    expect(getValue).not.toHaveBeenCalled();
  });
});
