import { reaction } from 'mobx';
import { describe, expect, it, vi } from 'vitest';

import { Configuration } from '../../openapi-generator';
import { type ApiType } from '../../types';
import { ApiStore } from '../ApiStore';

type TestApi = ApiType & {
  getValue: (request: { key: string }) => Promise<string>;
};

function createTestApi(): TestApi {
  return {
    getValue: vi.fn(({ key }: { key: string }) => Promise.resolve(`value:${key}`)),
  } as unknown as TestApi;
}

describe('ApiStore behavior', () => {
  it('creates and installs an API through initApi', () => {
    const api = createTestApi();
    const createApi = vi.fn(() => api);
    const store = new ApiStore<TestApi>({ name: 'TestStore', createApi });
    const config = new Configuration({ basePath: 'https://example.test' });

    store.initApi(config);

    expect(createApi).toHaveBeenCalledWith(config);
    expect(store.api?.getValue).toBeTypeOf('function');
    expect(store.apiIsSet).toBe(true);
    expect(store.isLoading).toBe(false);
  });

  it('throws an actionable error when initApi has no factory', () => {
    const store = new ApiStore<TestApi>('UnconfiguredStore');

    expect(() => store.initApi(new Configuration())).toThrow(
      "initApi is not implemented for UnconfiguredStore. Either provide a 'createApi' function in the constructor options or override the 'initApi' method in your subclass.",
    );
  });

  it('does not change loading state when disableLoading is true', async () => {
    const store = new ApiStore<TestApi>('TestStore');
    store.setApi(createTestApi());
    const loadingObserver = vi.fn();
    const dispose = reaction(() => store.isLoading, loadingObserver);

    const result = await store.apiCall<TestApi, 'getValue', { key: string }>(
      'getValue',
      { key: 'status' },
      { disableLoading: true },
    );

    expect(result).toBe('value:status');
    expect(loadingObserver).not.toHaveBeenCalled();
    expect(store.isLoading).toBe(false);
    dispose();
  });

  it('restores loading state after a failed API call', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = new ApiStore<TestApi>('TestStore');
    const api = {
      getValue: vi.fn().mockRejectedValue(new Error('Request failed')),
    } as unknown as TestApi;
    store.setApi(api);

    await expect(
      store.apiCall<TestApi, 'getValue', { key: string }>('getValue', {
        key: 'status',
      }),
    ).rejects.toThrow('Request failed');

    expect(store.isLoading).toBe(false);
  });

  it('keeps this when initApi is passed as a callback', () => {
    const api = createTestApi();
    const createApi = vi.fn(() => api);
    const store = new ApiStore<TestApi>({ name: 'BoundInitStore', createApi });
    const config = new Configuration({ basePath: 'https://example.test' });

    // Detach the method on purpose to assert actionBoundCompat kept `this`.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- intentional detach
    const { initApi } = store;
    initApi(config);

    expect(createApi).toHaveBeenCalledWith(config);
    expect(store.apiIsSet).toBe(true);
  });
});
