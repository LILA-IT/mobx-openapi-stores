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
} from 'mobx';

import { type ObjectType, type SingleType } from '../types';
import { type ApiConfig, type ApiType } from '../types/ApiType';
import {
  findCollectionEntryIdByItemId,
  findItemInCollectionEntries,
  getCollectionEntryOrWarn,
  type ObjectEntryPair,
} from './helpers/objectStoreCollection';
import { SingleStore } from './SingleStore';

/**
 * @class ObjectStore
 * @template TApi - The API client type, inherited from `SingleStore`.
 * @template TKey - The type for the keys of the main observable object (e.g., string, number).
 * @template TTarget - The type of the individual items that will be stored (must conform to `SingleType`).
 *                     If `TType` is 'collection', entries will be `TTarget[]`.
 * @template TType - Specifies whether entries in the object are single items ('single') or collections ('collection').
 *                   Defaults to 'collection'.
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
 * // Using createApi function (new approach)
 * const groupedTaskStore = new ObjectStore<TaskApi, string, Task, 'collection'>({
 *   name: 'GroupedTaskStore',
 *   createApi: (config) => new TaskApi(config)
 * });
 *
 * @example
 * // Extending with custom logic (recommended for complex cases)
 * class GroupedTaskStore extends ObjectStore<TaskApi, string, Task, 'collection'> {
 *   constructor(name?: string) {
 *     super(name || 'GroupedTaskStore');
 *     makeObservable(this, { addTaskToCategory: action });
 *   }
 *
 *   // initApi implementation
 *   initApi(config: TaskApiConfig) {
 *     this.setApi(new TaskApi(config));
 *   }
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
 *
 * @example
 * // Backwards compatible usage
 * class LegacyGroupedStore extends ObjectStore<TaskApi, string, Task> {
 *   constructor() {
 *     super('LegacyGroupedStore'); // Old signature still works
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

  /**
   * @constructor
   * @description Creates a new ObjectStore instance. Supports both legacy and new constructor signatures for backwards compatibility.
   * @param {string | { name?: string; createApi?: (config: ApiConfig<TApi>) => TApi }} [nameOrOptions]
   *        - Legacy: A string representing the store name
   *        - New: An options object with optional name and createApi function
   *
   * @example
   * // Legacy signature (backwards compatible)
   * const store1 = new ObjectStore('MyStore');
   *
   * @example
   * // New signature with createApi function
   * const store2 = new ObjectStore({
   *   name: 'MyStore',
   *   createApi: (config) => new MyApi(config)
   * });
   */
  constructor(
    nameOrOptions?:
      | string
      | { name?: string; createApi?: (config: ApiConfig<TApi>) => TApi },
  ) {
    super(nameOrOptions);
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
    const entryId = findCollectionEntryIdByItemId(this.#collectionEntryPairs(), itemId);
    return entryId as keyof TObject | undefined;
  }

  /**
   * @method getItemById
   * @description Finds a specific item (`TTarget`) by its `id` by searching through all entries.
   *              If entries are collections, it searches within those collections.
   * @param {TTarget['id']} itemId - The ID of the item to search for.
   * @returns {TTarget | undefined} The found item, or undefined if not found.
   */
  getItemById(itemId: TTarget['id']): TTarget | undefined {
    return findItemInCollectionEntries<TTarget>(this.#collectionEntryPairs(), itemId);
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
    const items = getCollectionEntryOrWarn({
      storeName: this.name,
      entryId: String(entryId),
      entry: this.getEntryById(entryId),
      action: 'add item',
    }) as TTarget[] | undefined;
    if (!items) return;
    items.push(item);
    this.setEntry(entryId, items as unknown as TObject[TKey]);
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
    const entry = getCollectionEntryOrWarn({
      storeName: this.name,
      entryId: String(entryId),
      entry: this.getEntryById(entryId),
      action: 'edit item',
    }) as TTarget[] | undefined;
    if (!entry) return;
    const itemIndex = entry.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return;
    entry[itemIndex] = itemUpdateData;
    this.setEntry(entryId as TKey, entry as unknown as TObject[TKey]);
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
    const entry = getCollectionEntryOrWarn({
      storeName: this.name,
      entryId: String(resolvedEntryId),
      entry: this.getEntryById(resolvedEntryId),
      action: 'remove item',
    }) as TTarget[] | undefined;
    if (!entry) return;
    const initialLength = entry.length;
    const next = entry.filter((item) => item.id !== itemId);
    if (next.length < initialLength)
      this.setEntry(resolvedEntryId as TKey, next as unknown as TObject[TKey]);
  }

  #collectionEntryPairs(): ObjectEntryPair[] {
    return entries(this._object) as ObjectEntryPair[];
  }
}
