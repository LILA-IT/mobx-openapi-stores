/**
 * Pure helpers for ObjectStore collection-shaped entries.
 * Kept free of store state so checks/finds can be unit-tested directly.
 */

export type ObjectEntryPair = [string, unknown];

export function isCollectionEntry(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Keeps only entries whose values are arrays (collection-shaped).
 * Non-array values are skipped rather than assumed from the first entry.
 */
export function filterCollectionEntries<TItem>(
  entryPairs: ObjectEntryPair[],
): [string, TItem[]][] {
  return entryPairs.filter((pair): pair is [string, TItem[]] =>
    isCollectionEntry(pair[1]),
  );
}

export function findCollectionEntryIdByItemId(
  entryPairs: ObjectEntryPair[],
  itemId: unknown,
): string | undefined {
  const found = filterCollectionEntries<{ id: unknown }>(entryPairs).find(([, items]) =>
    items.some((item) => item.id === itemId),
  );
  return found?.[0];
}

export function findItemInCollectionEntries<TItem extends { id: unknown }>(
  entryPairs: ObjectEntryPair[],
  itemId: TItem['id'],
): TItem | undefined {
  return filterCollectionEntries<TItem>(entryPairs)
    .flatMap(([, items]) => items)
    .find((item) => item.id === itemId);
}

export function getCollectionEntryOrWarn(options: {
  storeName: string;
  entryId: string;
  entry: unknown;
  action: string;
}): unknown[] | undefined {
  const { storeName, entryId, entry, action } = options;
  if (isCollectionEntry(entry)) return entry;
  console.warn(
    `[${storeName}] Cannot ${action}. Entry for id '${entryId}' is not an array.`,
  );
  return undefined;
}
