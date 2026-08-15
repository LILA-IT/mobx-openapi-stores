import { describe, expect, it, vi } from 'vitest';

import { Configuration } from '../../openapi-generator';
import { type ApiType } from '../../types';
import { ApiStore } from '../ApiStore';
import { expectBudget, observeSignal } from './helpers/reactivity';

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

function createTestApi(
  getValue: TestApi['getValue'] = ({ key }) => Promise.resolve(`value:${key}`),
): TestApi {
  return { getValue: vi.fn(getValue) } as unknown as TestApi;
}

function createReadyStore(api: TestApi = createTestApi()): ApiStore<TestApi> {
  const store = new ApiStore<TestApi>('TestStore');
  store.setApi(api);
  return store;
}

describe('ApiStore reactivity', () => {
  it('apiCall toggles isLoading true→false (budget N=2)', async () => {
    const store = createReadyStore();
    const handle = observeSignal(() => store.isLoading);

    const result = await store.apiCall<TestApi, 'getValue', { key: string }>('getValue', {
      key: 'a',
    });

    expect(result).toBe('value:a');
    expectBudget(handle, 2);
    expect(handle.observer.mock.calls.map(([value]) => value)).toEqual([true, false]);
    expect(store.isLoading).toBe(false);
    handle.dispose();
  });

  it('disableLoading leaves isLoading unchanged (budget N=0)', async () => {
    const store = createReadyStore();
    const handle = observeSignal(() => store.isLoading);

    const result = await store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'status' },
      { disableLoading: true },
    );

    expect(result).toBe('value:status');
    expectBudget(handle, 0);
    expect(store.isLoading).toBe(false);
    handle.dispose();
  });

  it('failed apiCall restores isLoading to false (budget N=2)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = createReadyStore(
      createTestApi(() => Promise.reject(new Error('Request failed'))),
    );
    const handle = observeSignal(() => store.isLoading);

    await expect(
      store.apiCall<TestApi, 'getValue', { key: string }>('getValue', {
        key: 'status',
      }),
    ).rejects.toThrow('Request failed');

    expectBudget(handle, 2);
    expect(handle.observer.mock.calls.map(([value]) => value)).toEqual([true, false]);
    expect(store.isLoading).toBe(false);
    handle.dispose();
  });

  it('createApi in constructor initializes via initApi', () => {
    const api = createTestApi();
    const createApi = vi.fn(() => api);
    const store = new ApiStore<TestApi>({ name: 'FactoryStore', createApi });
    const config = new Configuration({ basePath: 'https://example.test' });

    store.initApi(config);

    expect(createApi).toHaveBeenCalledWith(config);
    expect(store.apiIsSet).toBe(true);
    expect(store.isLoading).toBe(false);
  });

  it('throws when initApi is neither provided via createApi nor overridden', () => {
    const store = new ApiStore<TestApi>('UnconfiguredStore');

    expect(() => store.initApi(new Configuration())).toThrow(
      "initApi is not implemented for UnconfiguredStore. Either provide a 'createApi' function in the constructor options or override the 'initApi' method in your subclass.",
    );
  });

  it('subclass may override initApi instead of createApi', () => {
    const api = createTestApi();

    class OverriddenStore extends ApiStore<TestApi> {
      constructor() {
        super('OverriddenStore');
      }

      override initApi(_config: Configuration) {
        this.setApi(api);
      }
    }

    const store = new OverriddenStore();
    store.initApi(new Configuration({ basePath: 'https://example.test' }));

    // MobX deep-observability may wrap the assigned client; identity is not guaranteed.
    expect(store.apiIsSet).toBe(true);
    expect(store.api?.getValue).toBeTypeOf('function');
    expect(store.isLoading).toBe(false);
  });
});

describe('ApiStore reactivity — current behavior (loading races)', () => {
  it('current behavior: overlapping apiCalls — first completion clears isLoading while second still in flight', async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    let callCount = 0;
    const store = createReadyStore(
      createTestApi(() => {
        callCount += 1;
        return callCount === 1 ? first.promise : second.promise;
      }),
    );
    const handle = observeSignal(() => store.isLoading);

    const call1 = store.apiCall<TestApi, 'getValue', { key: string }>('getValue', {
      key: 'first',
    });
    const call2 = store.apiCall<TestApi, 'getValue', { key: string }>('getValue', {
      key: 'second',
    });

    // Both started: true then true again (same value → no second fire under MobX Object.is).
    expect(store.isLoading).toBe(true);
    expectBudget(handle, 1);

    first.resolve('value:first');
    await call1;

    // CURRENT BEHAVIOR: boolean loading clears when the first call's finally runs,
    // even though call2 is still in flight.
    expect(store.isLoading).toBe(false);
    expectBudget(handle, 2);

    second.resolve('value:second');
    await call2;

    expect(await call1).toBe('value:first');
    expect(await call2).toBe('value:second');
    expect(store.isLoading).toBe(false);
    // Second finally also writes false; same-value assignment does not notify again.
    expectBudget(handle, 2);
    handle.dispose();
  });

  it('current behavior: completion-order — last finishing apiCall wins the final isLoading write (still false)', async () => {
    const slow = createDeferred<string>();
    const fast = createDeferred<string>();
    let callCount = 0;
    const store = createReadyStore(
      createTestApi(() => {
        callCount += 1;
        return callCount === 1 ? slow.promise : fast.promise;
      }),
    );
    const handle = observeSignal(() => store.isLoading);

    const slowCall = store.apiCall<TestApi, 'getValue', { key: string }>('getValue', {
      key: 'slow',
    });
    const fastCall = store.apiCall<TestApi, 'getValue', { key: string }>('getValue', {
      key: 'fast',
    });

    expect(store.isLoading).toBe(true);

    // Fast call completes first → clears loading while slow is still pending.
    fast.resolve('value:fast');
    await expect(fastCall).resolves.toBe('value:fast');
    expect(store.isLoading).toBe(false);

    // Slow call completes last; apiCall returns its own value (no shared data slot).
    // Loading finally writes false again (no-op notify).
    slow.resolve('value:slow');
    await expect(slowCall).resolves.toBe('value:slow');
    expect(store.isLoading).toBe(false);

    expect(handle.observer.mock.calls.map(([value]) => value)).toEqual([true, false]);
    expectBudget(handle, 2);
    handle.dispose();
  });
});
