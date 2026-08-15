/**
 * CollectionStore mutation benches after the native Array cutover.
 *
 * Compare against the lodash baseline from `chore/benchmark-baseline`
 * (`setItem` / `editItem` / `removeItem` / `getById` on 1000 items).
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

describe('CollectionStore mutation (native Array + setCollection)', () => {
  bench('setItem (native map + setCollection) x1000', () => {
    const store = createFilledStore(1000);
    store.setItem({ id: 500, name: 'updated' }, false);
  });

  bench('editItem (assign + native map + setCollection) x1000', () => {
    const store = createFilledStore(1000);
    store.editItem({ id: 500, name: 'patched' }, false);
  });

  bench('removeItem (native filter + setCollection) x1000', () => {
    const store = createFilledStore(1000);
    store.removeItem(500);
  });

  bench('getById (lodash.find) x1000', () => {
    const store = createFilledStore(1000);
    store.getById(500);
  });
});
