import { describe, expect, it, vi } from 'vitest';

import {
  filterCollectionEntries,
  findCollectionEntryIdByItemId,
  findItemInCollectionEntries,
  getCollectionEntryOrWarn,
  isCollectionEntry,
} from '../helpers/objectStoreCollection';

type Item = { id: number; name: string };

describe('objectStoreCollection helpers', () => {
  it('isCollectionEntry accepts arrays only', () => {
    expect(isCollectionEntry([{ id: 1, name: 'a' }])).toBe(true);
    expect(isCollectionEntry({ id: 1, name: 'a' })).toBe(false);
    expect(isCollectionEntry(null)).toBe(false);
  });

  it('filterCollectionEntries skips non-array values instead of trusting the first entry', () => {
    const pairs: [string, unknown][] = [
      ['solo', { id: 1, name: 'solo' }],
      [
        'group-a',
        [
          { id: 2, name: 'a' },
          { id: 3, name: 'b' },
        ],
      ],
      ['empty', []],
    ];

    expect(filterCollectionEntries<Item>(pairs)).toEqual([
      [
        'group-a',
        [
          { id: 2, name: 'a' },
          { id: 3, name: 'b' },
        ],
      ],
      ['empty', []],
    ]);
  });

  it('findCollectionEntryIdByItemId searches every collection entry', () => {
    const pairs: [string, unknown][] = [
      ['solo', { id: 1, name: 'solo' }],
      ['group-a', [{ id: 2, name: 'a' }]],
      ['group-b', [{ id: 9, name: 'z' }]],
    ];

    expect(findCollectionEntryIdByItemId(pairs, 9)).toBe('group-b');
    expect(findCollectionEntryIdByItemId(pairs, 1)).toBeUndefined();
  });

  it('findItemInCollectionEntries flattens only array entries', () => {
    const pairs: [string, unknown][] = [
      ['solo', { id: 1, name: 'solo' }],
      ['group-a', [{ id: 2, name: 'a' }]],
    ];

    expect(findItemInCollectionEntries<Item>(pairs, 2)).toEqual({
      id: 2,
      name: 'a',
    });
    expect(findItemInCollectionEntries<Item>(pairs, 1)).toBeUndefined();
  });

  it('getCollectionEntryOrWarn returns arrays and warns otherwise', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(
      getCollectionEntryOrWarn({
        storeName: 'Test',
        entryId: 'g',
        entry: [{ id: 1, name: 'a' }],
        action: 'edit item',
      }),
    ).toEqual([{ id: 1, name: 'a' }]);

    expect(
      getCollectionEntryOrWarn({
        storeName: 'Test',
        entryId: 'g',
        entry: { id: 1, name: 'a' },
        action: 'edit item',
      }),
    ).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "[Test] Cannot edit item. Entry for id 'g' is not an array.",
    );

    warn.mockRestore();
  });
});
