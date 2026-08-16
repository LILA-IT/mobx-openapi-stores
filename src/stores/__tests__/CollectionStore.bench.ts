/**
 * CollectionStore mutation benches after native Array + Object.assign/find.
 *
 * Lodash assign/find baseline (same machine, pre-cutover):
 * - editItem (lodash.assign + map) ≈ 293.90 ops/s
 * - getById (lodash.find) ≈ 327.11 ops/s
 *
 * Native after cutover (same machine):
 * - editItem (Object.assign + map) ≈ 335.74 ops/s
 * - getById (Array.find) ≈ 363.84 ops/s
 */
import { bench, describe } from 'vitest';

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

describe('CollectionStore mutation (native Array + Object.assign/find)', () => {
  bench('setItem (native map + setCollection) x1000', () => {
    const store = createFilledStore(1000);
    store.setItem({ id: 500, name: 'updated' }, false);
  });

  bench('editItem (Object.assign + native map + setCollection) x1000', () => {
    const store = createFilledStore(1000);
    store.editItem({ id: 500, name: 'patched' }, false);
  });

  bench('removeItem (native filter + setCollection) x1000', () => {
    const store = createFilledStore(1000);
    store.removeItem(500);
  });

  bench('getById (Array.find) x1000', () => {
    const store = createFilledStore(1000);
    store.getById(500);
  });
});
