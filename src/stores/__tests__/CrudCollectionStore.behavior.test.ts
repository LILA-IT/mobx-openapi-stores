import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Configuration } from '../../openapi-generator';
import { type ApiType } from '../../types/ApiType';
import { CrudCollectionStore, type CrudFetchOptions } from '../CrudCollectionStore';

type Item = {
  id: string;
  name: string;
};

type TestApi = ApiType & {
  findAll: (args: Record<string, never>) => Promise<Item[]>;
  findOne: (args: { id: string }) => Promise<Item>;
  create: (args: { createDto: { name: string } }) => Promise<Item>;
  update: (args: { id: string; updateDto: { name: string } }) => Promise<Item>;
  remove: (args: { id: string }) => Promise<void>;
};

class TestCrudCollectionStore extends CrudCollectionStore<TestApi, Item> {
  // flow() fields keep a wide Endpoint generic; cast like production apiCall sites.
  fetchAll(options?: CrudFetchOptions) {
    return this._fetchAll('findAll' as never, {} as never, options);
  }

  fetchOne(id: string, options?: CrudFetchOptions & { setCurrent?: boolean }) {
    return this._fetch('findOne' as never, { id } as never, options);
  }

  createItem(name: string) {
    return this._create('create' as never, { createDto: { name } } as never);
  }

  updateItem(id: string, name: string) {
    return this._update(
      'update' as never,
      {
        id,
        updateDto: { name },
      } as never,
    );
  }

  deleteItem(id: string) {
    return this._delete('remove' as never, { id } as never);
  }
}

function createTestApi(overrides: Partial<TestApi> = {}): TestApi {
  return {
    findAll: vi.fn(() =>
      Promise.resolve([
        { id: '1', name: 'One' },
        { id: '2', name: 'Two' },
      ]),
    ),
    findOne: vi.fn(({ id }: { id: string }) =>
      Promise.resolve({ id, name: `Fetched-${id}` }),
    ),
    create: vi.fn(({ createDto }: { createDto: { name: string } }) =>
      Promise.resolve({ id: '3', name: createDto.name }),
    ),
    update: vi.fn(({ id, updateDto }: { id: string; updateDto: { name: string } }) =>
      Promise.resolve({ id, name: updateDto.name }),
    ),
    remove: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as TestApi;
}

function createReadyStore(api: TestApi = createTestApi()): TestCrudCollectionStore {
  const store = new TestCrudCollectionStore('CrudTest');
  store.setApi(api);
  return store;
}

describe('CrudCollectionStore behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAll sets collection from the API response', async () => {
    const api = createTestApi();
    const store = createReadyStore(api);

    const result = await store.fetchAll();

    expect(result).toEqual([
      { id: '1', name: 'One' },
      { id: '2', name: 'Two' },
    ]);
    expect(store.collection).toEqual([
      { id: '1', name: 'One' },
      { id: '2', name: 'Two' },
    ]);
    expect(api.findAll).toHaveBeenCalledOnce();
  });

  it('fetchAll with useCache skips the API when collection is non-empty', async () => {
    const api = createTestApi();
    const store = createReadyStore(api);
    store.setCollection([{ id: 'cached', name: 'Cached' }]);

    const result = await store.fetchAll({ useCache: true });

    expect(result).toEqual([{ id: 'cached', name: 'Cached' }]);
    expect(api.findAll).not.toHaveBeenCalled();
  });

  it('fetchAll with useCache calls the API when collection is empty', async () => {
    const api = createTestApi();
    const store = createReadyStore(api);

    await store.fetchAll({ useCache: true });

    expect(api.findAll).toHaveBeenCalledOnce();
    expect(store.collection).toEqual([
      { id: '1', name: 'One' },
      { id: '2', name: 'Two' },
    ]);
  });

  it('fetch one setItem updates a matching collection entry', async () => {
    const api = createTestApi();
    const store = createReadyStore(api);
    store.setCollection([{ id: '1', name: 'Stale' }]);

    const result = await store.fetchOne('1', { setCurrent: false });

    expect(result).toEqual({ id: '1', name: 'Fetched-1' });
    expect(store.collection).toEqual([{ id: '1', name: 'Fetched-1' }]);
    expect(api.findOne).toHaveBeenCalledWith({ id: '1' });
  });

  it('fetch one with useCache returns getById without calling the API', async () => {
    const api = createTestApi();
    const store = createReadyStore(api);
    store.setCollection([{ id: '1', name: 'Cached' }]);

    const result = await store.fetchOne('1', { useCache: true });

    expect(result).toEqual({ id: '1', name: 'Cached' });
    expect(api.findOne).not.toHaveBeenCalled();
  });

  it('create appends the created item to the collection', async () => {
    const api = createTestApi();
    const store = createReadyStore(api);
    store.setCollection([{ id: '1', name: 'One' }]);

    const result = await store.createItem('Three');

    expect(result).toEqual({ id: '3', name: 'Three' });
    expect(store.collection).toEqual([
      { id: '1', name: 'One' },
      { id: '3', name: 'Three' },
    ]);
    expect(api.create).toHaveBeenCalledWith({ createDto: { name: 'Three' } });
  });

  it('update merges the updated item into the collection', async () => {
    const api = createTestApi();
    const store = createReadyStore(api);
    store.setCollection([
      { id: '1', name: 'One' },
      { id: '2', name: 'Two' },
    ]);

    const result = await store.updateItem('2', 'Two-Updated');

    expect(result).toEqual({ id: '2', name: 'Two-Updated' });
    expect(store.collection).toEqual([
      { id: '1', name: 'One' },
      { id: '2', name: 'Two-Updated' },
    ]);
    expect(api.update).toHaveBeenCalledWith({
      id: '2',
      updateDto: { name: 'Two-Updated' },
    });
  });

  it('delete removes the item from the collection', async () => {
    const api = createTestApi();
    const store = createReadyStore(api);
    store.setCollection([
      { id: '1', name: 'One' },
      { id: '2', name: 'Two' },
    ]);

    await store.deleteItem('1');

    expect(store.collection).toEqual([{ id: '2', name: 'Two' }]);
    expect(api.remove).toHaveBeenCalledWith({ id: '1' });
  });

  it('throws when the API is not set', async () => {
    const store = new TestCrudCollectionStore('CrudTest');

    await expect(store.fetchAll()).rejects.toThrow('CrudTest Api is not set');
  });

  it('createApi constructor option initializes the API via initApi', () => {
    const api = createTestApi();
    const createApi = vi.fn(() => api);
    const store = new CrudCollectionStore<TestApi, Item>({
      name: 'FactoryCrudStore',
      createApi,
    });
    const config = new Configuration({ basePath: 'https://example.test' });

    store.initApi(config);

    expect(createApi).toHaveBeenCalledWith(config);
    expect(store.apiIsSet).toBe(true);
  });
});
