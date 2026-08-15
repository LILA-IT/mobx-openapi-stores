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

describe('ApiStore reactivity — loading refcount + ignore-stale', () => {
  it('overlapping apiCalls keep isLoading true until the last call settles (budget N=2)', async () => {
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

    expect(store.isLoading).toBe(true);
    expectBudget(handle, 1);

    first.resolve('value:first');
    await call1;

    expect(store.isLoading).toBe(true);
    expectBudget(handle, 1);

    second.resolve('value:second');
    await call2;

    expect(await call1).toBe('value:first');
    expect(await call2).toBe('value:second');
    expect(store.isLoading).toBe(false);
    expectBudget(handle, 2);
    handle.dispose();
  });

  it('apply without exclusiveKey runs for every successful call (parallel creates)', async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    let callCount = 0;
    const store = createReadyStore(
      createTestApi(() => {
        callCount += 1;
        return callCount === 1 ? first.promise : second.promise;
      }),
    );
    const applied: string[] = [];

    const call1 = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'first' },
      { apply: (result) => applied.push(String(result)) },
    );
    const call2 = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'second' },
      { apply: (result) => applied.push(String(result)) },
    );

    first.resolve('value:first');
    await call1;
    second.resolve('value:second');
    await call2;

    expect(applied).toEqual(['value:first', 'value:second']);
  });

  it('apply with exclusiveKey runs only for the latest started call in that key', async () => {
    const slow = createDeferred<string>();
    const fast = createDeferred<string>();
    let callCount = 0;
    const store = createReadyStore(
      createTestApi(() => {
        callCount += 1;
        return callCount === 1 ? slow.promise : fast.promise;
      }),
    );
    const applied: string[] = [];
    const exclusiveKey = 'fetchAll';

    const slowCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'slow' },
      {
        exclusiveKey,
        apply: (result) => applied.push(String(result)),
      },
    );
    const fastCall = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'fast' },
      {
        exclusiveKey,
        apply: (result) => applied.push(String(result)),
      },
    );

    fast.resolve('value:fast');
    await expect(fastCall).resolves.toBe('value:fast');
    expect(applied).toEqual(['value:fast']);

    slow.resolve('value:slow');
    await expect(slowCall).resolves.toBe('value:slow');
    // Stale slow completion still resolves, but exclusive apply is skipped.
    expect(applied).toEqual(['value:fast']);
  });

  it('exclusiveKey scopes do not cancel apply across different keys', async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    let callCount = 0;
    const store = createReadyStore(
      createTestApi(() => {
        callCount += 1;
        return callCount === 1 ? first.promise : second.promise;
      }),
    );
    const applied: string[] = [];

    const call1 = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      {
        exclusiveKey: 'fetch:1',
        apply: (result) => applied.push(String(result)),
      },
    );
    const call2 = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'b' },
      {
        exclusiveKey: 'fetch:2',
        apply: (result) => applied.push(String(result)),
      },
    );

    second.resolve('value:b');
    await call2;
    first.resolve('value:a');
    await call1;

    expect(applied).toEqual(['value:b', 'value:a']);
  });

  it('setApi absolute-clears isLoading even if apiCalls are still in flight', async () => {
    const pending = createDeferred<string>();
    const store = createReadyStore(createTestApi(() => pending.promise));
    const handle = observeSignal(() => store.isLoading);

    const inFlight = store.apiCall<TestApi, 'getValue', { key: string }>('getValue', {
      key: 'x',
    });
    expect(store.isLoading).toBe(true);

    store.setApi(createTestApi());
    expect(store.isLoading).toBe(false);
    expectBudget(handle, 2);

    pending.resolve('value:x');
    await inFlight;
    expect(store.isLoading).toBe(false);
    handle.dispose();
  });
});

describe('ApiStore reactivity — scoped loading keys', () => {
  it('defaults loadingKey to the endpoint name', async () => {
    const pending = createDeferred<string>();
    const store = createReadyStore(createTestApi(() => pending.promise));

    const call = store.apiCall<TestApi, 'getValue', { key: string }>('getValue', {
      key: 'x',
    });

    expect(store.isLoadingFor('getValue')).toBe(true);
    expect(store.isLoadingFor('other')).toBe(false);
    expect(store.isLoading).toBe(true);

    pending.resolve('value:x');
    await call;
    expect(store.isLoadingFor('getValue')).toBe(false);
    expect(store.isLoading).toBe(false);
  });

  it('loadingKey option isolates concurrent calls', async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    let callCount = 0;
    const store = createReadyStore(
      createTestApi(() => {
        callCount += 1;
        return callCount === 1 ? first.promise : second.promise;
      }),
    );

    const call1 = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'a' },
      { loadingKey: 'fetch:1' },
    );
    const call2 = store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'b' },
      { loadingKey: 'fetch:2' },
    );

    expect(store.isLoadingFor('fetch:1')).toBe(true);
    expect(store.isLoadingFor('fetch:2')).toBe(true);
    expect(store.isLoading).toBe(true);

    first.resolve('value:a');
    await call1;
    expect(store.isLoadingFor('fetch:1')).toBe(false);
    expect(store.isLoadingFor('fetch:2')).toBe(true);
    expect(store.isLoading).toBe(true);

    second.resolve('value:b');
    await call2;
    expect(store.isLoading).toBe(false);
  });

  it('getLoadingKey override can include args (swiss-army case)', async () => {
    const pending = createDeferred<string>();

    class KeyedStore extends ApiStore<TestApi> {
      override getLoadingKey(endpoint: PropertyKey, args: unknown): string {
        const id =
          args && typeof args === 'object' && 'key' in args
            ? (args as { key: string }).key
            : 'unknown';
        return `${String(endpoint)}:${id}`;
      }
    }

    const store = new KeyedStore('KeyedStore');
    store.setApi(createTestApi(() => pending.promise));

    const call = store.apiCall<TestApi, 'getValue', { key: string }>('getValue', {
      key: 'user-7',
    });

    expect(store.isLoadingFor('getValue:user-7')).toBe(true);
    expect(store.isLoadingFor('getValue')).toBe(false);

    pending.resolve('value:user-7');
    await call;
    expect(store.isLoadingFor('getValue:user-7')).toBe(false);
  });
});
