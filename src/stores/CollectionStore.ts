import { action, computed, makeObservable, observable } from 'mobx';

import { type ArrayElement, type CollectionType, type SingleType } from '../types';
import { type ApiConfig, type ApiType } from '../types/ApiType';
import { SingleStore } from './SingleStore';

/** Manages an observable entity collection and an optional current selection. */
export class CollectionStore<
  TApi extends ApiType,
  TSingle extends SingleType,
  TCollection extends CollectionType<TSingle> = TSingle[],
> extends SingleStore<TApi, TSingle> {
  /**
   * @protected
   * @property {TCollection} _collection - Internal observable collection.
   * @observable
   */
  _collection: TCollection = [] as unknown as TCollection;

  /**
   * @constructor
   * @description Creates a collection store using either the legacy name or
   * an options object that can also construct the API client.
   * @param {string | { name?: string; createApi?: (config: ApiConfig<TApi>) => TApi }} [nameOrOptions]
   * The store name, or store configuration.
   *
   * @example
   * const legacyStore = new CollectionStore<ProductApi, Product>('Products');
   *
   * @example
   * const store = new CollectionStore<ProductApi, Product>({
   *   name: 'Products',
   *   createApi: (config) => new ProductApi(config),
   * });
   */
  constructor(
    nameOrOptions?:
      string | { name?: string; createApi?: (config: ApiConfig<TApi>) => TApi },
  ) {
    super(nameOrOptions);
    makeObservable(this, {
      _collection: observable,
      collection: computed,
      setCollection: action,
      editCollection: action,
      addItem: action,
      editItem: action,
      removeItem: action,
      getById: false,
      setItem: action,
    });
  }

  /**
   * @property collection
   * @description Provides the current observable collection.
   * @returns {TCollection} The current collection.
   * @computed
   */
  get collection() {
    return this._collection;
  }

  /**
   * @method setCollection
   * @description Replaces the entire current collection with a new collection.
   * @param {TCollection} newCollection - The replacement collection.
   * @returns {void}
   * @action
   */
  setCollection = (newCollection: TCollection) => {
    this._collection = newCollection;
  };

  /**
   * @method editCollection
   * @description Replaces the complete collection. This is an alias for
   * `setCollection`.
   * @param {TCollection} updatedCollection - The replacement collection.
   * @returns {void}
   * @action
   */
  editCollection = (updatedCollection: TCollection) => {
    this.setCollection(updatedCollection);
  };

  /**
   * @method addItem
   * @description Appends an item to the observable collection and optionally
   * makes it the current item.
   * @param {TSingle} newItem - The item to append.
   * @param {boolean} [setCurrent=true] - Whether to select the appended item.
   * @returns {void}
   * @action
   */
  addItem = (newItem: TSingle, setCurrent: boolean = true) => {
    if (setCurrent) this.setCurrent(newItem);
    this._collection.push(newItem);
  };

  /**
   * @method setItem
   * @description Updates an existing item in the collection or leaves the
   * collection unchanged when no ID match is found. Native `Array.map` builds
   * the next array; `setCollection` replaces the observable reference.
   * @param {TSingle} item - The complete replacement item.
   * @param {boolean} [setCurrent=true] - Whether to select the item. A matching
   * current item is always replaced.
   * @returns {void}
   * @action
   */
  setItem = (item: TSingle, setCurrent: boolean = true) => {
    if (setCurrent || this.current?.id === item.id) this.setCurrent(item);
    this.setCollection(
      this._collection.map((collectionItem) =>
        collectionItem.id === item.id ? item : collectionItem,
      ) as TCollection,
    );
  };

  /**
   * @method editItem
   * @description Merges an update into every collection item with the same ID
   * using `Object.assign`, then publishes via native `Array.map` + `setCollection`.
   * @param {TSingle} updatedItem - The item data to merge, including its ID.
   * @param {boolean} [setCurrent=true] - Whether to select the update. A
   * matching current item is always updated.
   * @returns {void}
   * @action
   */
  editItem = (updatedItem: TSingle, setCurrent: boolean = true) => {
    if (setCurrent || this.current?.id === updatedItem.id) {
      this.setCurrent(updatedItem);
    }
    this.setCollection(
      this._collection.map((itemInCollection) =>
        itemInCollection.id === updatedItem.id
          ? Object.assign(itemInCollection, updatedItem)
          : itemInCollection,
      ) as TCollection,
    );
  };

  /**
   * @method removeItem
   * @description Removes an item by ID using native `Array.filter`, then
   * replaces the observable collection through `setCollection`. Clears
   * `current` when it references the removed ID.
   * @param {ArrayElement<TCollection>['id']} id - The ID to remove.
   * @returns {void}
   * @action
   */
  removeItem = (id: ArrayElement<TCollection>['id']) => {
    if (this.current?.id === id) this.setCurrent(null);
    this.setCollection(this._collection.filter((item) => item.id !== id) as TCollection);
  };

  /**
   * @method getById
   * @description Returns the matching current item first, otherwise searches
   * the collection with `find`.
   * @param {ArrayElement<TCollection>['id']} id - The ID to find.
   * @returns {ArrayElement<TCollection> | TSingle | undefined} The matching
   * item, or `undefined` when no item exists.
   */
  getById = (
    id: ArrayElement<TCollection>['id'],
  ): ArrayElement<TCollection> | TSingle | undefined => {
    if (this.current?.id === id) return this.current;
    return this.collection.find((item) => item.id === id) as
      ArrayElement<TCollection> | undefined;
  };
}
