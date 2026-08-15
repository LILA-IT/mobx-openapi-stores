import { describe, expect, it } from 'vitest';

import { type ApiType } from '../../types';
import { CollectionStore } from '../CollectionStore';
import { expectAtomic, expectBudget, observeSignal } from './helpers/reactivity';

type Item = {
  id: number;
  name: string;
};

function createStore(): CollectionStore<ApiType, Item> {
  const store = new CollectionStore<ApiType, Item>('CollectionTest');
  store.setCollection([
    { id: 1, name: 'First' },
    { id: 2, name: 'Second' },
  ]);
  return store;
}

function collectionFingerprint(store: CollectionStore<ApiType, Item>): string {
  return store.collection.map(({ id, name }) => `${String(id)}:${name}`).join(',');
}

describe('CollectionStore reactivity', () => {
  describe('liveness (content observers)', () => {
    it('notifies observers when setItem replaces an item', () => {
      const store = createStore();
      const handle = observeSignal(() => collectionFingerprint(store));

      store.setItem({ id: 1, name: 'Updated' }, false);

      expect(handle.observer).toHaveBeenCalledWith(
        '1:Updated,2:Second',
        '1:First,2:Second',
        expect.anything(),
      );
      handle.dispose();
    });

    it('notifies observers when editItem merges an item', () => {
      const store = createStore();
      const handle = observeSignal(() => collectionFingerprint(store));

      store.editItem({ id: 2, name: 'Edited' }, false);

      expect(handle.observer).toHaveBeenCalledWith(
        '1:First,2:Edited',
        '1:First,2:Second',
        expect.anything(),
      );
      handle.dispose();
    });

    it('notifies observers when removeItem removes an item', () => {
      const store = createStore();
      const handle = observeSignal(() => collectionFingerprint(store));

      store.removeItem(1);

      expect(handle.observer).toHaveBeenCalledWith(
        '2:Second',
        '1:First,2:Second',
        expect.anything(),
      );
      handle.dispose();
    });
  });

  describe('collection budget N=1 when data changes', () => {
    it('setCollection: collection content budget 1', () => {
      const store = createStore();
      const handle = observeSignal(() => collectionFingerprint(store));

      store.setCollection([{ id: 9, name: 'Nine' }]);

      expectBudget(handle, 1);
      handle.dispose();
    });

    it('addItem: collection content budget 1', () => {
      const store = createStore();
      const handle = observeSignal(() => collectionFingerprint(store));

      store.addItem({ id: 3, name: 'Third' }, false);

      expectBudget(handle, 1);
      handle.dispose();
    });

    it('setItem (existing id): collection content budget 1', () => {
      const store = createStore();
      const handle = observeSignal(() => collectionFingerprint(store));

      store.setItem({ id: 1, name: 'Updated' }, false);

      expectBudget(handle, 1);
      handle.dispose();
    });

    it('editItem (existing id): collection content budget 1', () => {
      const store = createStore();
      const handle = observeSignal(() => collectionFingerprint(store));

      store.editItem({ id: 2, name: 'Edited' }, false);

      expectBudget(handle, 1);
      handle.dispose();
    });

    it('removeItem: collection content budget 1', () => {
      const store = createStore();
      const handle = observeSignal(() => collectionFingerprint(store));

      store.removeItem(1);

      expectBudget(handle, 1);
      handle.dispose();
    });
  });

  describe('setItem/editItem always setCollection (new array ref)', () => {
    it('setItem missing id: collection ref budget 1 (map always new array)', () => {
      const store = createStore();
      const before = store.collection;
      const handle = observeSignal(() => store.collection);

      store.setItem({ id: 99, name: 'Missing' }, false);

      expect(store.collection).not.toBe(before);
      expectBudget(handle, 1);
      expect(collectionFingerprint(store)).toBe('1:First,2:Second');
      handle.dispose();
    });

    it('editItem missing id: collection ref budget 1 (map always new array)', () => {
      const store = createStore();
      const before = store.collection;
      const handle = observeSignal(() => store.collection);

      store.editItem({ id: 99, name: 'Missing' }, false);

      expect(store.collection).not.toBe(before);
      expectBudget(handle, 1);
      expect(collectionFingerprint(store)).toBe('1:First,2:Second');
      handle.dispose();
    });

    it('setItem missing id: collection content budget 0 (data unchanged)', () => {
      const store = createStore();
      const handle = observeSignal(() => collectionFingerprint(store));

      store.setItem({ id: 99, name: 'Missing' }, false);

      expectBudget(handle, 0);
      handle.dispose();
    });

    it('editItem missing id: collection content budget 0 (data unchanged)', () => {
      const store = createStore();
      const handle = observeSignal(() => collectionFingerprint(store));

      store.editItem({ id: 99, name: 'Missing' }, false);

      expectBudget(handle, 0);
      handle.dispose();
    });
  });

  describe('atomicity', () => {
    it('addItem(setCurrent=true): collection + current id update atomically', () => {
      const store = createStore();
      const newItem: Item = { id: 3, name: 'Third' };

      expectAtomic({
        readSnapshot: () => ({
          fingerprint: collectionFingerprint(store),
          currentId: store.current?.id ?? null,
        }),
        mutate: () => {
          store.addItem(newItem, true);
        },
        assertConsistent: (snapshot) => {
          const hasItem = snapshot.fingerprint.includes('3:Third');
          const currentIsNew = snapshot.currentId === 3;
          expect(hasItem).toBe(currentIsNew);
        },
      });

      expect(store.current?.id).toBe(3);
      expect(collectionFingerprint(store)).toBe('1:First,2:Second,3:Third');
    });

    it('removeItem when current matches: clears current + collection atomically', () => {
      const store = createStore();
      store.setCurrent({ id: 1, name: 'First' });

      expectAtomic({
        readSnapshot: () => ({
          fingerprint: collectionFingerprint(store),
          currentId: store.current?.id ?? null,
        }),
        mutate: () => {
          store.removeItem(1);
        },
        assertConsistent: (snapshot) => {
          expect(snapshot.fingerprint.includes('1:')).toBe(false);
          expect(snapshot.currentId).not.toBe(1);
        },
      });

      expect(store.current).toBeNull();
      expect(collectionFingerprint(store)).toBe('2:Second');
    });

    it('removeItem when current does not match: current budget 0, collection budget 1', () => {
      const store = createStore();
      store.setCurrent({ id: 2, name: 'Second' });

      const collectionHandle = observeSignal(() => collectionFingerprint(store));
      const currentHandle = observeSignal(() => store.current?.id ?? null);

      store.removeItem(1);

      expectBudget(collectionHandle, 1);
      expectBudget(currentHandle, 0);
      expect(store.current?.id).toBe(2);
      expect(collectionFingerprint(store)).toBe('2:Second');

      collectionHandle.dispose();
      currentHandle.dispose();
    });
  });

  describe('setItem/editItem update current when id matches even if setCurrent=false', () => {
    it('setItem(setCurrent=false) still updates current when current.id matches (budget 1)', () => {
      const store = createStore();
      store.setCurrent({ id: 1, name: 'First' });

      const currentHandle = observeSignal(() => store.current?.name ?? null);
      const collectionHandle = observeSignal(() => collectionFingerprint(store));

      store.setItem({ id: 1, name: 'Updated' }, false);

      expectBudget(currentHandle, 1);
      expectBudget(collectionHandle, 1);
      expect(store.current?.name).toBe('Updated');
      expect(collectionFingerprint(store)).toBe('1:Updated,2:Second');

      currentHandle.dispose();
      collectionHandle.dispose();
    });

    it('editItem(setCurrent=false) still updates current when current.id matches (budget 1)', () => {
      const store = createStore();
      store.setCurrent({ id: 2, name: 'Second' });

      const currentHandle = observeSignal(() => store.current?.name ?? null);
      const collectionHandle = observeSignal(() => collectionFingerprint(store));

      store.editItem({ id: 2, name: 'Edited' }, false);

      expectBudget(currentHandle, 1);
      expectBudget(collectionHandle, 1);
      expect(store.current?.name).toBe('Edited');
      expect(collectionFingerprint(store)).toBe('1:First,2:Edited');

      currentHandle.dispose();
      collectionHandle.dispose();
    });

    it('setItem(setCurrent=false) does not touch current when ids differ (current budget 0)', () => {
      const store = createStore();
      store.setCurrent({ id: 2, name: 'Second' });

      const currentHandle = observeSignal(() => store.current?.id ?? null);

      store.setItem({ id: 1, name: 'Updated' }, false);

      expectBudget(currentHandle, 0);
      expect(store.current?.id).toBe(2);

      currentHandle.dispose();
    });
  });
});
