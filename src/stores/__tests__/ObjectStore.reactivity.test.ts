import { entries } from 'mobx';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ApiType } from '../../types';
import { ObjectStore } from '../ObjectStore';
import { expectBudget, observeSignal } from './helpers/reactivity';

type Item = {
  id: number | string;
  name: string;
};

function createStore(): ObjectStore<ApiType, string | number, Item> {
  const store = new ObjectStore<ApiType, string | number, Item>('ObjectReact');
  store.setEntry('group-a', [
    { id: 1, name: 'Alpha' },
    { id: 2, name: 'Beta' },
  ]);
  store.setEntry('group-b', [{ id: 3, name: 'Gamma' }]);
  return store;
}

/** Snapshot of entry keys + nested item ids (stable JSON for reaction equality). */
function readObjectIdsSnapshot(
  store: ObjectStore<ApiType, string | number, Item>,
): string {
  return JSON.stringify(
    entries(store.object)
      .map(([key, items]) => [key, items.map((item) => item.id)])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  );
}

/** Snapshot of one entry's id:name pairs. */
function readEntrySnapshot(
  store: ObjectStore<ApiType, string | number, Item>,
  entryId: string | number,
): string {
  const items = store.getEntryById(entryId);
  if (!items) return '';
  return items.map((item) => `${String(item.id)}:${item.name}`).join(',');
}

describe('ObjectStore reactivity', () => {
  let store: ObjectStore<ApiType, string | number, Item>;

  beforeEach(() => {
    store = createStore();
    vi.restoreAllMocks();
  });

  it('notifies once when setEntry replaces an entry collection', () => {
    const handle = observeSignal(() => readObjectIdsSnapshot(store));

    store.setEntry('group-a', [{ id: 10, name: 'Replaced' }]);

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      JSON.stringify([
        ['group-a', [10]],
        ['group-b', [3]],
      ]),
      JSON.stringify([
        ['group-a', [1, 2]],
        ['group-b', [3]],
      ]),
      expect.anything(),
    );
    handle.dispose();
  });

  it('notifies once when removeEntry deletes a key', () => {
    const handle = observeSignal(() => readObjectIdsSnapshot(store));

    store.removeEntry('group-b');

    expectBudget(handle, 1);
    expect(readObjectIdsSnapshot(store)).toBe(JSON.stringify([['group-a', [1, 2]]]));
    handle.dispose();
  });

  it('notifies once when addItem appends to an entry', () => {
    const handle = observeSignal(() => readEntrySnapshot(store, 'group-a'));

    store.addItem('group-a', { id: 4, name: 'Delta' });

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      '1:Alpha,2:Beta,4:Delta',
      '1:Alpha,2:Beta',
      expect.anything(),
    );
    handle.dispose();
  });

  it('does not notify when addItem warns because the entry is missing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const handle = observeSignal(() => readObjectIdsSnapshot(store));

    store.addItem('missing', { id: 99, name: 'Nope' });

    expectBudget(handle, 0);
    handle.dispose();
  });

  it('notifies once when editItem updates a nested item name', () => {
    const handle = observeSignal(() => readEntrySnapshot(store, 'group-b'));

    store.editItem(3, { id: 3, name: 'GammaEdited' });

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      '3:GammaEdited',
      '3:Gamma',
      expect.anything(),
    );
    handle.dispose();
  });

  it('does not notify when editItem cannot find the item id', () => {
    const handle = observeSignal(() => readObjectIdsSnapshot(store));

    store.editItem(99, { id: 99, name: 'Missing' });

    expectBudget(handle, 0);
    handle.dispose();
  });

  it('notifies once when removeItem deletes a nested item', () => {
    const handle = observeSignal(() => readEntrySnapshot(store, 'group-a'));

    store.removeItem(1);

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      '2:Beta',
      '1:Alpha,2:Beta',
      expect.anything(),
    );
    handle.dispose();
  });

  it('does not notify when removeItem cannot find the item id', () => {
    const handle = observeSignal(() => readObjectIdsSnapshot(store));

    store.removeItem(99);

    expectBudget(handle, 0);
    handle.dispose();
  });

  it('notifies once when setEntry uses a numeric key', () => {
    const handle = observeSignal(() => readObjectIdsSnapshot(store));

    store.setEntry(42, [{ id: 'n', name: 'Numeric' }]);

    expectBudget(handle, 1);
    expect(readObjectIdsSnapshot(store)).toBe(
      JSON.stringify([
        ['42', ['n']],
        ['group-a', [1, 2]],
        ['group-b', [3]],
      ]),
    );
    handle.dispose();
  });
});
