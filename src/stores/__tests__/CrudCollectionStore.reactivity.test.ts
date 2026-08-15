import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ApiType } from '../../types/ApiType';
import { CrudCollectionStore, type CrudFetchOptions } from '../CrudCollectionStore';
import { expectBudget, observeSignal } from './helpers/reactivity';

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

function collectionFingerprint(store: TestCrudCollectionStore): string {
  return store.collection.map(({ id, name }) => `${id}:${name}`).join(',');
}

describe('CrudCollectionStore reactivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchAll: collection content budget 1', async () => {
    const store = createReadyStore();
    const handle = observeSignal(() => collectionFingerprint(store));

    await store.fetchAll();

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith('1:One,2:Two', '', expect.anything());
    handle.dispose();
  });

  it('create: collection content budget 1', async () => {
    const store = createReadyStore();
    store.setCollection([{ id: '1', name: 'One' }]);
    const handle = observeSignal(() => collectionFingerprint(store));

    await store.createItem('Three');

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      '1:One,3:Three',
      '1:One',
      expect.anything(),
    );
    handle.dispose();
  });

  it('update: collection content budget 1', async () => {
    const store = createReadyStore();
    store.setCollection([
      { id: '1', name: 'One' },
      { id: '2', name: 'Two' },
    ]);
    const handle = observeSignal(() => collectionFingerprint(store));

    await store.updateItem('2', 'Two-Updated');

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      '1:One,2:Two-Updated',
      '1:One,2:Two',
      expect.anything(),
    );
    handle.dispose();
  });

  it('delete: collection content budget 1', async () => {
    const store = createReadyStore();
    store.setCollection([
      { id: '1', name: 'One' },
      { id: '2', name: 'Two' },
    ]);
    const handle = observeSignal(() => collectionFingerprint(store));

    await store.deleteItem('1');

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      '2:Two',
      '1:One,2:Two',
      expect.anything(),
    );
    handle.dispose();
  });

  it('fetch one setItem: collection content budget 1', async () => {
    const store = createReadyStore();
    store.setCollection([{ id: '1', name: 'Stale' }]);
    const handle = observeSignal(() => collectionFingerprint(store));

    await store.fetchOne('1', { setCurrent: false });

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      '1:Fetched-1',
      '1:Stale',
      expect.anything(),
    );
    handle.dispose();
  });

  it('useCache fetchAll leaves collection budget 0', async () => {
    const store = createReadyStore();
    store.setCollection([{ id: 'cached', name: 'Cached' }]);
    const handle = observeSignal(() => collectionFingerprint(store));

    await store.fetchAll({ useCache: true });

    expectBudget(handle, 0);
    handle.dispose();
  });
});
