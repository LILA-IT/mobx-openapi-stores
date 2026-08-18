import { flow, makeObservable } from 'mobx';

import { type ArrayElement, type CollectionType, type SingleType } from '../types';
import { type ApiConfig, type ApiType } from '../types/ApiType';
import type { ApiMethodArgs, ApiMethodName } from '../utils/api/types/ApiMethod.type';
import { CollectionStore } from './CollectionStore';

/** Options for cache-aware CRUD reads. */
export type CrudFetchOptions = {
  useCache?: boolean;
};

/** Provides protected, flow-wrapped CRUD helpers for concrete collection stores. */
export class CrudCollectionStore<
  TApi extends ApiType,
  TSingle extends SingleType,
  TCollection extends CollectionType<TSingle> = TSingle[],
> extends CollectionStore<TApi, TSingle, TCollection> {
  /** Creates a CRUD store from a name or API factory options. */
  constructor(
    nameOrOptions?:
      string | { name?: string; createApi?: (config: ApiConfig<TApi>) => TApi },
  ) {
    super(nameOrOptions);
    makeObservable(this, {
      _fetch: flow,
      _fetchAll: flow,
      _create: flow,
      _update: flow,
      _delete: flow,
    });
  }

  /**
   * @protected
   * @method _fetch
   * @template Endpoint - A key of `TApi` representing the API endpoint for fetching a single item.
   * @template Args - The argument type for the specified `Endpoint`, typically including an `id`.
   * @description Protected helper method to fetch a single item by ID via an API call.
   *              It handles caching (if `useCache` is true and item exists) and updates the item in the store using `setItem`.
   * @param {Endpoint} endpoint - The API endpoint method name (must be a key of `TApi`).
   * @param {Args & { id: ArrayElement<TCollection>['id'] }} args - Arguments for the API call, must include the `id` of the item to fetch.
   * @param {CrudFetchOptions & { setCurrent?: boolean }} [options={}] - Options for the fetch operation, e.g., `useCache, setCurrent`.
   * @returns {Promise<TSingle | ArrayElement<TCollection> | undefined>} A promise resolving to the fetched item, or undefined if not found/error.
   * @flow
   */
  _fetch = flow(function* <
    Endpoint extends ApiMethodName<TApi>,
    Args extends ApiMethodArgs<TApi, Endpoint>,
  >(
    this: CrudCollectionStore<TApi, TSingle, TCollection>,
    endpoint: Endpoint,
    args: Args extends undefined
      ? never
      : Args & {
          id: ArrayElement<TCollection>['id'];
        },
    {
      useCache = false,
      setCurrent = true,
    }: CrudFetchOptions & {
      setCurrent?: boolean;
    } = {},
  ) {
    let item: TSingle | ArrayElement<TCollection> | undefined;
    if (useCache) {
      const cachedItem: unknown = yield Promise.resolve(this.getById(args.id));
      item = cachedItem as TSingle | ArrayElement<TCollection> | undefined;
    }
    if (!useCache || !item) {
      const result = (yield this.apiCall(endpoint as never, args as never, {
        exclusiveKey: `fetch:${String(args.id)}`,
        apply: (payload) => {
          if (!payload) return;
          this.setItem(payload as TSingle, setCurrent);
        },
      })) as unknown as TSingle | undefined;
      // Prefer store state so a superseded exclusive fetch does not return stale payload.
      item = this.getById(args.id) ?? result;
      if (!item) return;
    }
    return item;
  });

  /**
   * @protected
   * @method _fetchAll
   * @template Endpoint - A key of `TApi` representing the API endpoint for fetching a collection of items.
   * @template Args - The argument type for the specified `Endpoint`.
   * @description Protected helper method to fetch all items via an API call.
   *              Handles caching (if `useCache` is true and collection exists) and updates the entire store collection using `setCollection`.
   * @param {Endpoint} endpoint - The API endpoint method name (must be a key of `TApi`).
   * @param {Args} args - Arguments for the API call.
   * @param {CrudFetchOptions} [options={}] - Options for the fetch operation, e.g., `useCache`.
   * @returns {Promise<TCollection | undefined>} A promise resolving to the fetched collection, or undefined if error.
   * @flow
   */
  _fetchAll = flow(function* <
    Endpoint extends ApiMethodName<TApi>,
    Args extends ApiMethodArgs<TApi, Endpoint>,
  >(
    this: CrudCollectionStore<TApi, TSingle, TCollection>,
    endpoint: Endpoint,
    args: Args extends undefined ? never : Args,
    { useCache = false }: CrudFetchOptions = {},
  ) {
    let items: TCollection | undefined;
    if (useCache && this.collection.length > 0) {
      const cachedItems: unknown = yield Promise.resolve(this.collection);
      items = cachedItems as TCollection;
    }
    if (!useCache || !items) {
      items = (yield this.apiCall(endpoint as never, args, {
        exclusiveKey: 'fetchAll',
        apply: (result) => {
          if (result) {
            this.setCollection(result as TCollection);
            return;
          }
          this.setCollection([] as unknown as TCollection);
          console.warn(`[${this.name}] API call returned null/undefined for collection`);
        },
      })) as TCollection | undefined;
    }
    return items;
  });

  /**
   * @protected
   * @method _create
   * @template Endpoint - A key of `TApi` representing the API endpoint for creating an item.
   * @template Args - The argument type for the specified `Endpoint` (e.g., a CreateDTO object).
   * @description Protected helper method to create a new item via an API call.
   *              Adds the newly created item to the store's collection using `addItem`.
   * @param {Endpoint} endpoint - The API endpoint method name (must be a key of `TApi`).
   * @param {Args} args - Arguments for the API call, typically the DTO for creation.
   * @returns {Promise<TSingle | undefined>} A promise resolving to the created item (as TSingle), or undefined if creation failed or returned no item.
   * @throws {Error} If the API endpoint does not return an item after creation.
   * @flow
   */
  _create = flow(function* <
    Endpoint extends ApiMethodName<TApi>,
    Args extends ApiMethodArgs<TApi, Endpoint>,
  >(
    this: CrudCollectionStore<TApi, TSingle, TCollection>,
    endpoint: Endpoint,
    args: Args extends undefined ? never : Args,
  ) {
    const item = (yield this.apiCall(endpoint as never, args, {
      apply: (result) => {
        if (result) this.addItem(result as TSingle);
      },
    })) as unknown as TSingle | undefined;
    if (!item) {
      throw new Error('Create Endpoint did not return an item');
    }
    return item;
  });

  /**
   * @protected
   * @method _update
   * @template Endpoint - A key of `TApi` representing the API endpoint for updating an item.
   * @template Args - The argument type for the specified `Endpoint` (e.g., an UpdateDTO object, usually including an ID).
   * @description Protected helper method to update an existing item via an API call.
   *              Updates the item in the store's collection using `editItem`.
   * @param {Endpoint} endpoint - The API endpoint method name (must be a key of `TApi`).
   * @param {Args} args - Arguments for the API call, typically including the ID of the item and the DTO for updates.
   * @returns {Promise<TSingle | undefined>} A promise resolving to the updated item (as TSingle), or undefined if update failed or returned no item.
   * @throws {Error} If the API endpoint does not return an item after update.
   * @flow
   */
  _update = flow(function* <
    Endpoint extends ApiMethodName<TApi>,
    Args extends ApiMethodArgs<TApi, Endpoint>,
  >(
    this: CrudCollectionStore<TApi, TSingle, TCollection>,
    endpoint: Endpoint,
    args: Args extends undefined ? never : Args,
  ) {
    const item = (yield this.apiCall(endpoint as never, args, {
      apply: (result) => {
        if (result) this.editItem(result as TSingle);
      },
    })) as unknown as TSingle | undefined;
    if (!item) {
      throw new Error('Update Endpoint did not return an item');
    }
    return item;
  });

  /**
   * @protected
   * @method _delete
   * @template Endpoint - A key of `TApi` representing the API endpoint for deleting an item.
   * @template Args - The argument type for the specified `Endpoint`, typically including an `id`.
   * @description Protected helper method to delete an item by its ID via an API call.
   *              Removes the item from the store's collection using `removeItem`.
   * @param {Endpoint} endpoint - The API endpoint method name (must be a key of `TApi`).
   * @param {Args & { id: ArrayElement<TCollection>['id'] }} args - Arguments for the API call, must include the `id` of the item to delete.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   * @flow
   */
  _delete = flow(function* <
    Endpoint extends ApiMethodName<TApi>,
    Args extends ApiMethodArgs<TApi, Endpoint>,
  >(
    this: CrudCollectionStore<TApi, TSingle, TCollection>,
    endpoint: Endpoint,
    args: Args extends undefined
      ? never
      : Args & {
          id: ArrayElement<TCollection>['id'];
        },
  ) {
    return (yield this.apiCall(endpoint as never, args as never, {
      apply: () => {
        this.removeItem(args.id);
      },
    })) as unknown;
  });
}
