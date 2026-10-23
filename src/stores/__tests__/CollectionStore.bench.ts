import { describe, test } from 'vitest';

import { type ApiType } from '../../types';
import { CollectionStore } from '../CollectionStore';

type Item = { id: number; name: string };

const createFilledStore = (size: number) => {
  const store = new CollectionStore<ApiType, Item>('BenchCollection');
  const items: Item[] = Array.from({ length: size }, (_, id) => ({
    id,
    name: `item-${String(id)}`,
  }));
  store.setCollection(items);
  return store;
};

describe('CollectionStore mutations', () => {
  test('setItem (native map + setCollection) x1000', async ({ bench }) => {
    await bench('setItem (native map + setCollection) x1000', () => {
      const store = createFilledStore(1000);
      store.setItem({ id: 500, name: 'updated' }, false);
    }).run();
  });

  test('editItem (Object.assign + native map + setCollection) x1000', async ({
    bench,
  }) => {
    await bench('editItem (Object.assign + native map + setCollection) x1000', () => {
      const store = createFilledStore(1000);
      store.editItem({ id: 500, name: 'patched' }, false);
    }).run();
  });

  test('removeItem (native filter + setCollection) x1000', async ({ bench }) => {
    await bench('removeItem (native filter + setCollection) x1000', () => {
      const store = createFilledStore(1000);
      store.removeItem(500);
    }).run();
  });

  test('getById (Array.find) x1000', async ({ bench }) => {
    await bench('getById (Array.find) x1000', () => {
      const store = createFilledStore(1000);
      store.getById(500);
    }).run();
  });
});
