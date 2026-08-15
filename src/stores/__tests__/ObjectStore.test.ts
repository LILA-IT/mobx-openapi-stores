import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ApiType } from '../../types';
import { ObjectStore } from '../ObjectStore';

type Item = {
  id: number | string;
  name: string;
};

function createStore(name = 'ObjectTest'): ObjectStore<ApiType, string | number, Item> {
  return new ObjectStore<ApiType, string | number, Item>(name);
}

describe('ObjectStore', () => {
  let store: ObjectStore<ApiType, string | number, Item>;

  beforeEach(() => {
    store = createStore();
    vi.restoreAllMocks();
  });

  it('starts with an empty object', () => {
    expect(store.object).toEqual({});
  });

  it('stores and returns an entry via setEntry and getEntryById', () => {
    const items: Item[] = [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ];

    store.setEntry('group-a', items);

    expect(store.getEntryById('group-a')).toEqual(items);
    expect(store.getById('group-a')).toEqual(items);
  });

  it('stores and retrieves entries keyed by numeric ids', () => {
    const items: Item[] = [{ id: 'x', name: 'NumericKey' }];

    store.setEntry(42, items);

    expect(store.getEntryById(42)).toEqual(items);
    expect(store.getById(42)).toEqual(items);
    expect(store.entryIsSet(42)).toBe(true);
  });

  it('treats numeric and string forms of the same id as one key', () => {
    store.setEntry(7, [{ id: 1, name: 'Seven' }]);

    expect(store.getEntryById('7')).toEqual([{ id: 1, name: 'Seven' }]);
    expect(store.entryIsSet('7')).toBe(true);
  });

  it('returns undefined from getEntryById and getById when the key is missing', () => {
    expect(store.getEntryById('missing')).toBeUndefined();
    expect(store.getById('missing')).toBeUndefined();
  });

  it('reports entry presence via entryIsSet', () => {
    expect(store.entryIsSet('group-a')).toBe(false);

    store.setEntry('group-a', [{ id: 1, name: 'Alpha' }]);

    expect(store.entryIsSet('group-a')).toBe(true);
  });

  it('removes an entry via removeEntry', () => {
    store.setEntry('group-a', [{ id: 1, name: 'Alpha' }]);

    store.removeEntry('group-a');

    expect(store.entryIsSet('group-a')).toBe(false);
    expect(store.getEntryById('group-a')).toBeUndefined();
  });

  it('appends an item to an existing collection entry via addItem', () => {
    store.setEntry('group-a', [{ id: 1, name: 'Alpha' }]);

    store.addItem('group-a', { id: 2, name: 'Beta' });

    expect(store.getEntryById('group-a')).toEqual([
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ]);
  });

  it('warns and leaves state unchanged when addItem targets a missing entry', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    store.addItem('missing', { id: 1, name: 'Orphan' });

    expect(warn).toHaveBeenCalledWith(
      "[ObjectTest] Cannot add item. Entry for id 'missing' is not an array.",
    );
    expect(store.entryIsSet('missing')).toBe(false);
    expect(store.getEntryById('missing')).toBeUndefined();
  });

  it('warns and leaves state unchanged when addItem targets a non-array entry', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    store.setEntry('group-a', { id: 1, name: 'NotArray' } as unknown as Item[]);

    store.addItem('group-a', { id: 2, name: 'Extra' });

    expect(warn).toHaveBeenCalledWith(
      "[ObjectTest] Cannot add item. Entry for id 'group-a' is not an array.",
    );
    expect(store.getEntryById('group-a')).toEqual({ id: 1, name: 'NotArray' });
  });

  it('updates a nested item across entries via editItem', () => {
    store.setEntry('group-a', [{ id: 1, name: 'Alpha' }]);
    store.setEntry('group-b', [{ id: 2, name: 'Beta' }]);

    store.editItem(2, { id: 2, name: 'BetaEdited' });

    expect(store.getEntryById('group-a')).toEqual([{ id: 1, name: 'Alpha' }]);
    expect(store.getEntryById('group-b')).toEqual([{ id: 2, name: 'BetaEdited' }]);
  });

  it('leaves state unchanged when editItem cannot find the item id', () => {
    store.setEntry('group-a', [{ id: 1, name: 'Alpha' }]);

    store.editItem(99, { id: 99, name: 'Missing' });

    expect(store.getEntryById('group-a')).toEqual([{ id: 1, name: 'Alpha' }]);
  });

  it('removes a nested item via removeItem without an entryId', () => {
    store.setEntry('group-a', [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ]);

    store.removeItem(1);

    expect(store.getEntryById('group-a')).toEqual([{ id: 2, name: 'Beta' }]);
  });

  it('removes a nested item via removeItem when entryId is provided', () => {
    store.setEntry('group-a', [{ id: 1, name: 'Alpha' }]);
    store.setEntry('group-b', [{ id: 2, name: 'Beta' }]);

    store.removeItem(2, 'group-b');

    expect(store.getEntryById('group-a')).toEqual([{ id: 1, name: 'Alpha' }]);
    expect(store.getEntryById('group-b')).toEqual([]);
  });

  it('leaves state unchanged when removeItem cannot find the item id', () => {
    store.setEntry('group-a', [{ id: 1, name: 'Alpha' }]);

    store.removeItem(99);

    expect(store.getEntryById('group-a')).toEqual([{ id: 1, name: 'Alpha' }]);
  });

  it('returns the item from getItemById when it exists in any entry', () => {
    store.setEntry('group-a', [{ id: 1, name: 'Alpha' }]);
    store.setEntry('group-b', [{ id: 's', name: 'StringId' }]);

    expect(store.getItemById(1)).toEqual({ id: 1, name: 'Alpha' });
    expect(store.getItemById('s')).toEqual({ id: 's', name: 'StringId' });
  });

  it('returns undefined from getItemById when the item id is missing', () => {
    store.setEntry('group-a', [{ id: 1, name: 'Alpha' }]);

    expect(store.getItemById(99)).toBeUndefined();
  });

  it('returns the entry key from getEntryIdByItemId for a nested item', () => {
    store.setEntry('group-a', [{ id: 1, name: 'Alpha' }]);
    store.setEntry('group-b', [{ id: 2, name: 'Beta' }]);

    expect(store.getEntryIdByItemId(2)).toBe('group-b');
  });

  it('returns undefined from getEntryIdByItemId when the item id is missing', () => {
    store.setEntry('group-a', [{ id: 1, name: 'Alpha' }]);

    expect(store.getEntryIdByItemId(99)).toBeUndefined();
  });

  it('returns a stringified key from getEntryIdByItemId when the entry was set with a numeric key', () => {
    store.setEntry(10, [{ id: 5, name: 'Five' }]);

    expect(store.getEntryIdByItemId(5)).toBe('10');
  });
});
