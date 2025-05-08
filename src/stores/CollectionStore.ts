import { action, computed, makeObservable, observable } from 'mobx';

import { type CollectionType, type ArrayElement, type SingleType } from '../types';

import { type ApiType } from '../types/ApiType';
import { SingleStore } from './SingleStore';
import assign from 'lodash.assign';
import map from 'lodash.map';
import remove from 'lodash.remove';
import find from 'lodash.find';

/**
 * @class CollectionStore
 * @template TApi - The type of the generated API client, inherited from `SingleStore`.
 * @template TSingle - The type of individual entities within the collection. Must conform to `SingleType`.
 * @template TCollection - The type of the collection itself, defaulting to `TSingle[]`.
 * @description A store for managing a collection (array) of observable entities.
 * It extends `SingleStore` to also manage a `current` item (useful for selections) and inherits API capabilities.
 * Provides common methods for manipulating the collection such as adding, updating, and removing items.
 *
 * @extends SingleStore<TApi, TSingle>
 *
 * @property {TCollection} collection - A computed property providing access to the observable array of entities (`_collection`).
 *
 * @method setCollection - Action to replace the entire collection with a new one.
 * @method editCollection - Action that also replaces the entire collection (alias for `setCollection`).
 * @method addItem - Action to add a new item to the collection. Optionally sets the new item as `current`.
 * @method setItem - Action to update an existing item in the collection by its `id` or add it if not present.
 *                 Optionally updates/sets the `current` item if its `id` matches.
 * @method editItem - Action to update an existing item in the collection by its `id`.
 *                  If `setCurrent` is true or the updated item is the `current` one, `current` is also updated.
 * @method removeItem - Action to remove an item from the collection by its `id`. Clears `current` if the removed item was current.
 * @method getById - Retrieves an item from the collection by its `id`. Checks `current` first, then searches the collection.
 *
 * @example
 * // Assuming Product is { id: string, name: string, price: number } and ProductApi is the API client
 * class ProductListStore extends CollectionStore<ProductApi, Product> {
 *   constructor() {
 *     super('ProductListStore');
 *     // makeObservable is called in CollectionStore for its specific members
 *   }
 *
 *   // initApi would be implemented here
 *   initApi(config: ProductApiConfig) { this.setApi(new ProductApi(config)); }
 *
 *   async addAndSelectProduct(productData: CreateProductDto) {
 *     // Assuming createProduct returns the full product with an id
 *     const newProduct = await this.apiCall('createProduct', { createProductDto: productData });
 *     if (newProduct) {
 *       this.addItem(newProduct as Product, true); // Add and set as current
 *     }
 *   }
 * }
 */
export class CollectionStore<
  TApi extends ApiType,
  TSingle extends SingleType,
  TCollection extends CollectionType<TSingle> = TSingle[],
> extends SingleStore<TApi, TSingle> {
  /**
   * @protected
   * @property {TCollection} _collection - The internal observable array holding the collection of entities.
   * @observable
   */
  _collection: TCollection = [] as unknown as TCollection;

  constructor(name: string) {
    super(name);
    makeObservable(this, {
      _collection: observable,
      collection: computed,
      setCollection: action,
      editCollection: action,
      addItem: action,
      editItem: action,
      removeItem: action,
      getById: false, // Not directly an observable, but good to list in makeObservable if its behavior is tied to observables
      setItem: action,
    });
  }

  /**
   * @property collection
   * @description Computed property that provides access to the observable collection of entities.
   * @returns {TCollection} The current collection of entities.
   * @computed
   */
  get collection() {
    return this._collection;
  }

  /**
   * @method setCollection
   * @description Replaces the entire current collection with a new collection.
   * @param {TCollection} newCollection - The new collection to set.
   * @action
   */
  setCollection = (newCollection: TCollection) => {
    this._collection = newCollection;
  };

  /**
   * @method editCollection
   * @description Replaces the entire current collection with an updated collection. Alias for `setCollection`.
   * @param {TCollection} updatedCollection - The updated collection to set.
   * @action
   */
  editCollection = (updatedCollection: TCollection) => {
    this.setCollection(updatedCollection);
  };

  /**
   * @method addItem
   * @description Adds a new item to the end of the collection.
   * @param {TSingle} newItem - The new item to add to the collection.
   * @param {boolean} [setCurrent=true] - If true (default), the newly added item will also be set as the `current` item in the store.
   * @action
   */
  addItem = (newItem: TSingle, setCurrent: boolean = true) => {
    if (setCurrent) this.setCurrent(newItem);
    this._collection.push(newItem);
  };

  /**
   * @method setItem
   * @description Updates an existing item in the collection or adds it if it's not found by ID.
   *              If the item's ID matches the `current` item's ID, or if `setCurrent` is true, the `current` item is also updated/set.
   * @param {TSingle} item - The item to set/update in the collection.
   * @param {boolean} [setCurrent=true] - If true (default) and the item is being added or its ID matches `current`,
   *                                      it updates/sets the `current` item.
   * @action
   */
  setItem = (item: TSingle, setCurrent: boolean = true) => {
    if (setCurrent || this.current?.id === item.id) this.setCurrent(item);
    this.setCollection(
      // @ts-expect-error lodash types might not perfectly align with TCollection generic constraints
      map(this._collection, (collectionItem: ArrayElement<TCollection>) =>
        collectionItem.id === item.id ? item : collectionItem,
      ),
    );
  };

  /**
   * @method editItem
   * @description Updates an existing item in the collection by its ID. Properties of the existing item are merged with the `updatedItem`.
   *              If `setCurrent` is true, or if the `current` item has the same ID as `updatedItem`, the `current` item is also updated.
   * @param {TSingle} updatedItem - An object containing the properties to update on the existing item. Must include the `id`.
   * @param {boolean} [setCurrent=true] - If true (default), the `current` item in the store will be updated if its ID matches.
   *                                      If the `current` item itself is being updated, it will always be updated regardless of this flag.
   * @action
   */
  editItem = (updatedItem: TSingle, setCurrent: boolean = true) => {
    if (setCurrent || this.current?.id === updatedItem.id) {
      assign(this._current, updatedItem);
    }
    this.setCollection(
      // @ts-expect-error lodash types might not perfectly align with TCollection/TSingle constraints
      map(this._collection, (itemInCollection: ArrayElement<TCollection>) =>
        itemInCollection.id === updatedItem.id
          ? assign(itemInCollection, updatedItem)
          : itemInCollection,
      ),
    );
  };

  /**
   * @method removeItem
   * @description Removes an item from the collection by its ID.
   *              If the removed item was the `current` item, `current` will be set to `null`.
   * @param {ArrayElement<TCollection>['id']} id - The ID of the item to remove.
   * @action
   */
  removeItem = (id: ArrayElement<TCollection>['id']) => {
    if (this.current?.id === id) this.setCurrent(null);
    remove(this._collection, (item) => item.id === id);
  };

  /**
   * @method getById
   * @description Retrieves an item by its ID. It first checks if the `current` item matches the ID,
   *              then searches the collection.
   * @param {ArrayElement<TCollection>['id']} id - The ID of the item to retrieve.
   * @returns {ArrayElement<TCollection> | TSingle | undefined} The found item, or undefined if not found.
   *          The return type can be an element from the collection or the `current` (TSingle) item.
   */
  getById = (
    id: ArrayElement<TCollection>['id'],
  ): ArrayElement<TCollection> | TSingle | undefined => {
    if (this.current?.id === id) return this.current;
    return find(
      this.collection,
      (item) => item.id === id,
    ) as ArrayElement<TCollection>; // Cast assuming find returns a TCollection element or undefined.
  };
}
