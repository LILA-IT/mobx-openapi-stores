import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ApiType } from '../../types';
import { isStaleResult } from '../../utils/api';
import { ApiStore } from '../ApiStore';

/*
 * Regression tests for issue #8: a failure that becomes stale while its error message is
 * still being read (the response body) must not be applied, logged or settled as current.
 */

type TestApi = ApiType & {
  getValue: (request: { key: string }) => Promise<string>;
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

/** A fetch-like error whose body read waits until `body.resolve` is called. */
function createSlowBodyError() {
  const body = createDeferred<string>();
  const bodyRequested = createDeferred<undefined>();
  // Like the `ResponseError` of generated clients: an Error that carries the response.
  const error = Object.assign(new Error('Response returned an error code'), {
    response: {
      status: 500,
      statusText: 'Internal Server Error',
      text: () => {
        bodyRequested.resolve(undefined);
        return body.promise;
      },
    },
  });
  return { error, body, bodyRequested: bodyRequested.promise };
}

/** Each call to `getValue` settles with the next outcome: a deferred value, or a rejection. */
function createStore(outcomes: (Deferred<string> | { reject: Error })[]) {
  let callCount = 0;
  const getValue = vi.fn(() => {
    const outcome = outcomes.at(callCount);
    callCount += 1;
    if (!outcome) throw new Error('Unexpected call');
    if ('promise' in outcome) return outcome.promise;
    return Promise.reject(outcome.reject);
  });
  const store = new ApiStore<TestApi>('StaleErrorMessageTestStore');
  store.setApi({ getValue });
  return { store, getValue };
}

describe('ApiStore failure superseded while its error message is read', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves a stale result (marker) without logging when a newer call starts during the body read', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const slow = createSlowBodyError();
    const newer = createDeferred<string>();
    const { store } = createStore([{ reject: slow.error }, newer]);
    const applied: unknown[] = [];
    const isStale = vi.fn(() => false);
    const options = {
      exclusiveKey: 'list',
      staleResult: 'marker' as const,
      isStale,
      apply: (result: unknown) => applied.push(result),
    };

    const olderCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      options,
    );
    await slow.bodyRequested;
    const newerCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'ab' },
      options,
    );
    slow.body.resolve(JSON.stringify({ message: 'older failed' }));
    const olderResult = await olderCall;

    expect(isStaleResult(olderResult)).toBe(true);
    expect(olderResult).toMatchObject({ reason: 'superseded', error: slow.error });
    expect(consoleError).not.toHaveBeenCalled();
    expect(isStale).toHaveBeenCalledWith(slow.error);

    newer.resolve('value:ab');
    await expect(newerCall).resolves.toBe('value:ab');
    expect(applied).toEqual(['value:ab']);
    expect(store.isLoading).toBe(false);
  });

  it('rejects (default contract) without logging when a newer call starts during the body read', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const slow = createSlowBodyError();
    const newer = createDeferred<string>();
    const { store } = createStore([{ reject: slow.error }, newer]);
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
    await slow.bodyRequested;
    const newerCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'ab' },
      options,
    );
    slow.body.resolve(JSON.stringify({ message: 'older failed' }));

    await expect(olderCall).rejects.toMatchObject({
      message: 'older failed',
      cause: slow.error,
    });
    expect(consoleError).not.toHaveBeenCalled();

    newer.resolve('value:ab');
    await expect(newerCall).resolves.toBe('value:ab');
    expect(applied).toEqual(['value:ab']);
    expect(store.isLoading).toBe(false);
  });

  it('stays stale when the newer call settles (and prunes the key) before the body read ends', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const slow = createSlowBodyError();
    const newer = createDeferred<string>();
    const { store } = createStore([{ reject: slow.error }, newer]);
    const options = { exclusiveKey: 'list', staleResult: 'marker' as const };

    const olderCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      options,
    );
    await slow.bodyRequested;
    const newerCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'ab' },
      options,
    );
    newer.resolve('value:ab');
    await expect(newerCall).resolves.toBe('value:ab');
    slow.body.resolve(JSON.stringify({ message: 'older failed' }));

    await expect(olderCall).resolves.toMatchObject({ reason: 'superseded' });
    expect(consoleError).not.toHaveBeenCalled();
    expect(store.isLoading).toBe(false);
  });

  it('still logs and rejects the newer call when it fails after the older one went stale', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const slow = createSlowBodyError();
    const { store } = createStore([
      { reject: slow.error },
      { reject: new Error('newer failed') },
    ]);
    const options = { exclusiveKey: 'list' };

    const olderCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      options,
    );
    await slow.bodyRequested;
    const newerCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'ab' },
      options,
    );
    slow.body.resolve(JSON.stringify({ message: 'older failed' }));
    await expect(olderCall).rejects.toThrow('older failed');
    await expect(newerCall).rejects.toThrow('newer failed');

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      'Error Message:',
      'newer failed',
      expect.any(Error),
    );
  });

  it('keeps the newer call current while the stale one settles, and prunes it when it settles', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const slow = createSlowBodyError();
    const newer = createDeferred<string>();
    const { store } = createStore([{ reject: slow.error }, newer]);
    const options = { exclusiveKey: 'list', staleResult: 'marker' as const };

    const olderCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      options,
    );
    await slow.bodyRequested;
    const newerCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'ab' },
      options,
    );
    // Generations share one counter, so the newer call holds the one before this probe.
    const newerGeneration = store.beginExclusiveCall('probe') - 1;
    slow.body.resolve('');
    await olderCall;

    expect(store.isApiCallCurrent('list', newerGeneration)).toBe(true);
    newer.resolve('value:ab');
    await newerCall;
    expect(store.isApiCallCurrent('list', newerGeneration)).toBe(false);
  });
});
