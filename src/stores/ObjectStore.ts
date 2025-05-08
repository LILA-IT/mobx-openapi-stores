import {
  action,
  computed,
  entries,
  get,
  has,
  makeObservable,
  observable,
  remove,
  set,
  values,
} from 'mobx';

import { type ApiType } from '../types/ApiType';
import { SingleStore } from './SingleStore';
import find from 'lodash.find';
import flatMap from 'lodash.flatmap';
import _remove from 'lodash.remove';
import { type ObjectType, type SingleType } from 'src/types';

/**
 * @class ObjectStore
 * @template TApi - The API client type, inherited from `SingleStore`.
 * @template TKey - The type for the keys of the main observable object (e.g., string, number).
 * @template TTarget - The type of the individual items that will be stored (must conform to `SingleType`).
 *                     If `TType` is 'collection', entries will be `TTarget[]`.
 * @template TType - Specifies whether entries in the object are single items ('single') or collections ('collection').
 *                   Defaults to 'collection'. **Note: The default in the class signature provided was 'collection', but in `ObjectType` it was 'single'. Assuming 'collection' for the store as it has collection-oriented methods like `addItem`. Please verify.**
 * @template TObject - The overall shape of the observable object, conforming to `ObjectType<TKey, TTarget, TType>`.
 *
 * @description Manages a dictionary-like observable object (`_object`) where each key maps to either a single entity
 * or a collection of entities (of type `TTarget`). This is useful for grouping items by a common key,
 * such as tasks grouped by project ID, or comments grouped by post ID.
 * Extends `SingleStore` (using `TTarget` as the `TSingle` for `SingleStore` context, for managing a `current` item of type `TTarget`).
 *
 * @extends SingleStore<TApi, TTarget>
 *
 * @property {TObject} object - A computed property providing access to the root observable object.
 *
 * @method getEntryById - Retrieves the entry (a `TTarget` or `TTarget[]`) associated with a given `TKey`.
 * @method getById - Alias for `getEntryById`.
 * @method setEntry - Sets or updates the entry for a given `TKey`.
 * @method removeEntry - Removes an entry from the object by its `TKey`.
 * @method entryIsSet - Checks if an entry exists for a given `TKey`.
 *
 * Methods for when `TType` is 'collection':
 * @method addItem - Adds a `TTarget` item to the collection at the specified `entryId` (`TKey`).
 * @method editItem - Finds an item by its `id` across all collection entries and updates it.
 * @method removeItem - Removes an item by its `id` from its collection entry. Can optionally specify the `entryId`.
 * @method getEntryIdByItemId - Finds the `TKey` (entry ID) to which an item (by its `id`) belongs.
 * @method getItemById - Finds a specific `TTarget` item by its `id` by searching through all collection entries.
 *
 * @example
 * // Tasks grouped by category (string keys, Task items, entries are collections)
 * class GroupedTaskStore extends ObjectStore<TaskApi, string, Task, 'collection'> {
 *   constructor() {
 *     super('GroupedTaskStore');
 *     // initApi and other necessary makeObservable calls for public methods would go here
 *   }
 *
 *   // initApi implementation
 *   initApi(config: TaskApiConfig) { this.setApi(new TaskApi(config)); }
 *
 *   async addTaskToCategory(categoryId: string, taskData: CreateTaskDto) {
 *     const newTask = await this.apiCall('createTask', { taskData }) as Task; // Assuming API call returns Task
 *     if (newTask) {
 *       if (!this.entryIsSet(categoryId)) {
 *         this.setEntry(categoryId, [] as Task[]); // Initialize category if it doesn't exist
 *       }
 *       this.addItem(categoryId, newTask);
 *     }
 *   }
 * }
 */
export class ObjectStore<
  TApi extends ApiType,
  TKey extends SingleType['id'],
  TTarget extends SingleType = SingleType,
  TType extends 'collection' = 'collection',
  TObject extends ObjectType<TKey, TTarget, TType> = ObjectType<TKey, TTarget, TType>,
> extends SingleStore<TApi, TTarget> {
  /**
   * @protected
   * @property {TObject} _object - The internal observable object holding keyed entries.
   * @observable
   */
  _object = observable.object<TObject>({} as TObject);

  constructor(name: string) {
    super(name);
    makeObservable(this, {
      _object: observable,
      object: computed,
      getEntryById: false,
      getById: false,
      setEntry: action,
      removeEntry: action,
      entryIsSet: false,
      addItem: action,
      editItem: action,
      removeItem: action,
      getEntryIdByItemId: false,
      getItemById: false,
    });
  }

  /**
   * @property object
   * @description Computed property providing access to the root observable object map.
   * @returns {TObject} The observable object.
   * @computed
   */
  get object() {
    return this._object;
  }

  /**
   * @method getEntryById
   * @description Retrieves the entry associated with a given key.
   *              An entry can be a single `TTarget` or `TTarget[]` depending on `TType`.
   * @param {keyof TObject | TKey} id - The key of the entry to retrieve.
   * @returns {TObject[TKey] | undefined} The entry if found, otherwise undefined.
   */
  getEntryById(id: keyof TObject | TKey): TObject[TKey] | undefined {
    return get(this._object, String(id)) as TObject[TKey] | undefined; // Cast id to string as mobx get expects string keys
  }

  /**
   * @method getById
   * @description Alias for `getEntryById`. Retrieves the entry associated with a given key.
   * @param {TKey} id - The key of the entry to retrieve.
   * @returns {TObject[TKey] | undefined} The entry if found, otherwise undefined.
   */
  getById(id: TKey): TObject[TKey] | undefined {
    return this.getEntryById(id);
  }

  /**
   * @method setEntry
   * @description Sets or updates the entry for a given key in the observable object.
   * @param {keyof TObject | TKey} id - The key of the entry to set.
   * @param {TObject[TKey]} item - The item or collection to set for the entry.
   * @action
   */
  setEntry(id: keyof TObject | TKey, item: TObject[TKey]): void {
    set(this._object, String(id), item);
  }

  /**
   * @method removeEntry
   * @description Removes an entry from the observable object by its key.
   * @param {TKey} id - The key of the entry to remove.
   * @action
   */
  removeEntry(id: TKey): void {
    remove(this._object, String(id));
  }

  /**
   * @method entryIsSet
   * @description Checks if an entry exists in the observable object for a given key.
   * @param {TKey} id - The key to check for existence.
   * @returns {boolean} True if the entry exists, false otherwise.
   */
  entryIsSet(id: TKey): boolean {
    return has(this._object, String(id));
  }

  /**
   * @method getEntryIdByItemId
   * @description Finds the entry key (`TKey`) to which a specific item (by its `id`) belongs.
   *              This method is primarily useful when `TType` is 'collection'.
   * @param {TTarget['id']} itemId - The ID of the item to search for.
   * @returns {keyof TObject | undefined} The key of the entry containing the item, or undefined if not found.
   */
  getEntryIdByItemId(itemId: TTarget['id']): keyof TObject | undefined {
    const e = entries(this._object);
    // Ensure entries are arrays before trying to use .some()
    if (e.length > 0 && Array.isArray(e[0][1])) {
      const foundEntry = e.find(([, /*entryKey*/ entryValue]) =>
        entryValue.some((item) => item.id === itemId),
      );
      if (foundEntry) {
        return foundEntry[0] as keyof TObject;
      }
    }
    return undefined;
  }

  /**
   * @method getItemById
   * @description Finds a specific item (`TTarget`) by its `id` by searching through all entries.
   *              If entries are collections, it searches within those collections.
   * @param {TTarget['id']} itemId - The ID of the item to search for.
   * @returns {TTarget | undefined} The found item, or undefined if not found.
   */
  getItemById(itemId: TTarget['id']): TTarget | undefined {
    // flatMap will iterate over single items if TType is 'single' or items in arrays if 'collection'
    return find(
      flatMap(values(this._object), (entry) => entry),
      (item) => item.id === itemId,
    );
  }

  /**
   * @method addItem
   * @description Adds an item to a collection-type entry specified by `entryId`.
   *              This method assumes `TType` is 'collection' for the given `entryId`.
   *              If the entry does not exist or is not an array, this operation might not behave as expected
   *              or could error, depending on prior state setup (e.g. ensuring entry is initialized as an array).
   * @param {TKey} entryId - The key of the entry (which should be a collection) to add the item to.
   * @param {TTarget} item - The item to add.
   * @action
   */
  addItem(entryId: TKey, item: TTarget): void {
    const items = this.getEntryById(entryId);
    if (Array.isArray(items)) {
      items.push(item);
      // `setEntry` might not be strictly necessary if `items` is the observable array itself and MobX tracks its mutation.
      // However, calling setEntry ensures MobX is aware of a change to the object property if `items` was a copy.
      // For direct mutation of observable array, this.setEntry(entryId, items); might be redundant if `items` IS the observable array.
      // To be safe and explicit, especially if getEntryById could return a non-observable copy:
      this.setEntry(entryId, items);
    } else {
      // Handle case where entry is not an array (e.g., if TType can be mixed or entry not initialized as array)
      console.warn(
        `[${this.name}] Cannot add item. Entry for id '${String(entryId)}' is not an array.`,
      );
      // Or, initialize if desired: this.setEntry(entryId, [item] as unknown as TObject[TKey]);
    }
  }

  /**
   * @method editItem
   * @description Finds an item by its `id` across all collection-type entries and updates its properties.
   *              This method assumes `TType` is 'collection' for the relevant entry.
   * @param {TTarget['id']} itemId - The ID of the item to update.
   * @param {TTarget} itemUpdateData - An object containing the properties to update. It should include the `id` to match.
   * @action
   */
  editItem(itemId: TTarget['id'], itemUpdateData: TTarget): void {
    const entryId = this.getEntryIdByItemId(itemId);
    if (!entryId) return;
    const entry = this.getEntryById(entryId);
    if (!Array.isArray(entry)) {
      console.warn(
        `[${this.name}] Cannot edit item. Entry for id '${String(entryId)}' is not an array.`,
      );
      return;
    }
    const itemIndex = entry.findIndex((item) => item.id === itemId);
    if (itemIndex !== -1) {
      entry[itemIndex] = itemUpdateData;
      this.setEntry(entryId, entry);
    }
  }

  /**
   * @method removeItem
   * @description Removes an item by its `id` from its collection-type entry.
   *              If `entryId` is not provided, it attempts to find the item's entry first.
   *              This method assumes `TType` is 'collection' for the relevant entry.
   * @param {TTarget['id']} itemId - The ID of the item to remove.
   * @param {keyof TObject} [entryId] - Optional: The key of the entry from which to remove the item.
   *                                    If not provided, `getEntryIdByItemId` will be used.
   * @action
   */
  removeItem(itemId: TTarget['id'], entryId?: keyof TObject): void {
    const resolvedEntryId = entryId ?? this.getEntryIdByItemId(itemId);
    if (!resolvedEntryId) return;
    const entry = this.getEntryById(resolvedEntryId);
    if (!Array.isArray(entry)) {
      console.warn(
        `[${this.name}] Cannot remove item. Entry for id '${String(resolvedEntryId)}' is not an array.`,
      );
      return;
    }
    const initialLength = entry.length;
    _remove(entry, (item) => item.id === itemId);
    if (entry.length < initialLength) {
      // Check if an item was actually removed
      this.setEntry(resolvedEntryId, entry);
    }
  }
}
