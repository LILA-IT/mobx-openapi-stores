/**
 * ObjectStore mutation/lookup benches after native Array cutover.
 *
 * Compare against the lodash baseline from `chore/objectstore-lodash-bench-baseline`
 * (20 groups × 50 items).
 */
import { bench, describe } from 'vitest';

import { type ApiType } from '../../types';
import { ObjectStore } from '../ObjectStore';

type Item = { id: number; name: string };

const GROUPS = 20;
const ITEMS_PER_GROUP = 50;

function createFilledStore(): ObjectStore<ApiType, string, Item> {
  const store = new ObjectStore<ApiType, string, Item>('BenchObject');
  for (let g = 0; g < GROUPS; g += 1) {
    const items: Item[] = Array.from({ length: ITEMS_PER_GROUP }, (_, i) => {
      const id = g * ITEMS_PER_GROUP + i;
      return { id, name: `item-${String(id)}` };
    });
    store.setEntry(`group-${String(g)}`, items);
  }
  return store;
}

describe('ObjectStore mutation (native flatMap/filter/find)', () => {
  bench('getItemById (native flatMap + find) x1000 items', () => {
    const store = createFilledStore();
    store.getItemById(500);
  });

  bench('getEntryIdByItemId x1000 items', () => {
    const store = createFilledStore();
    store.getEntryIdByItemId(500);
  });

  bench('editItem (find entry + setEntry) x1000 items', () => {
    const store = createFilledStore();
    store.editItem(500, { id: 500, name: 'patched' });
  });

  bench('removeItem (native filter + setEntry) x1000 items', () => {
    const store = createFilledStore();
    store.removeItem(500);
  });

  bench('addItem (push + setEntry) x1000 items', () => {
    const store = createFilledStore();
    store.addItem('group-0', { id: 99999, name: 'new' });
  });
});
