import { flow, makeObservable } from 'mobx';
import { toFlowGeneratorFunction } from 'to-flow-generator-function';

import { type ArrayElement } from '../types';

import { type ApiType } from '../types/ApiType';
import { type SingleType } from './SingleStore';
import { CollectionStore, type CollectionType } from './CollectionStore';

/**
 * @typedef CrudFetchOptions
 * @description Options for fetch operations in `CrudCollectionStore`.
 * @property {boolean} [useCache=false] - If true, attempts to retrieve data from the local store cache first.
 */
export type CrudFetchOptions = {
  useCache?: boolean;
};

// TODO: Add CrudConfig type
/**
 * @typedef CrudConfig
 * @description Configuration for `CrudCollectionStore`.
 * @property {string} [createEndpoint] - The API endpoint for creating an item.
 * @property {string} [fetchAllEndpoint] - The API endpoint for fetching all items.
 * @property {string} [fetchOneEndpoint] - The API endpoint for fetching a single item by ID.
 * @property {string} [updateEndpoint] - The API endpoint for updating an item.
 * @property {string} [deleteEndpoint] - The API endpoint for deleting an item.
 */
// export type CrudConfig<TApi extends ApiType> = {
//   createEndpoint?: keyof TApi & string;
//   fetchAllEndpoint?: keyof TApi & string;
//   fetchByIdEndpoint?: keyof TApi & string;
//   updateEndpoint?: keyof TApi & string;
//   deleteEndpoint?: keyof TApi & string;
// };
/**
 * @class CrudCollectionStore
 * @template TApi - The type of the generated API client.
 * @template TSingle - The type of individual entities in the collection, must conform to `SingleType`.
 * @template TCollection - The type of the collection, defaults to `TSingle[]`.
 * @description Extends `CollectionStore` to provide protected, MobX flow-wrapped helper methods
 * for common CRUD (Create, Read, Update, Delete) operations. These methods (`_fetch`, `_fetchAll`,
 * `_create`, `_update`, `_delete`) are designed to be called by public-facing methods in concrete
 * subclasses, simplifying the implementation of standard data management tasks.
 *
 * Users of this package will typically extend `CrudCollectionStore` to create specific data stores
 * for their application entities, implementing public methods that call these protected helpers.
 *
 * @extends CollectionStore<TApi, TSingle, TCollection>
 *
 * @protected @method _fetch - Fetches a single item by its ID using a specified API endpoint and updates the store.
 * @protected @method _fetchAll - Fetches all items using a specified API endpoint and updates the store's collection.
 * @protected @method _create - Creates a new item using a specified API endpoint and adds it to the store's collection.
 * @protected @method _update - Updates an existing item using a specified API endpoint and reflects changes in the store.
 * @protected @method _delete - Deletes an item by its ID using a specified API endpoint and removes it from the store.
 *
 * @example
 * // Assuming Task is { id: string, title: string, completed: boolean } and TaskApi provides CRUD methods.
 * // CreateTaskDto and UpdateTaskDto are respective DTOs for create/update operations.
 *
 * class TaskStore extends CrudCollectionStore<TaskApi, Task> {
 *   constructor() {
 *     super('TaskStore');
 *     // makeObservable is called in CrudCollectionStore for its flow methods.
 *     // Add public methods if you expose them differently or need more specific makeObservable calls.
 *     makeObservable(this, {
 *       // Public-facing methods that will call the protected _methods
 *       fetchAllTasks: flow,
 *       fetchTaskById: flow,
 *       createNewTask: flow,
 *       updateExistingTask: flow,
 *       deleteTaskById: flow,
 *       initApi: action, // Assuming initApi is an action
 *     });
 *   }
 *
 *   // Example: Implement initApi from ApiStore
 *   initApi(config: TaskApiConfig) {
 *     this.setApi(new TaskApi(config));
 *   }
 *
 *   fetchAllTasks = flow(async (options?: CrudFetchOptions) => {
 *     // 'taskControllerFindAll' is a placeholder for your actual API endpoint key in TaskApi
 *     return await this._fetchAll('taskControllerFindAll', {}, options);
 *   });
 *
 *   fetchTaskById = flow(async (id: Task['id'], options?: CrudFetchOptions) => {
 *     return await this._fetch('taskControllerFindOne', { id }, options);
 *   });
 *
 *   createNewTask = flow(async (taskData: CreateTaskDto) => {
 *     return await this._create('taskControllerCreate', { createTaskDto: taskData });
 *   });
 *
 *   updateExistingTask = flow(async (id: Task['id'], taskData: UpdateTaskDto) => {
 *     return await this._update('taskControllerUpdate', { id, updateTaskDto: taskData });
 *   });
 *
 *   deleteTaskById = flow(async (id: Task['id']) => {
 *     return await this._delete('taskControllerRemove', { id });
 *   });
 * }
 */

export class CrudCollectionStore<
  TApi extends ApiType,
  TSingle extends SingleType,
  TCollection extends CollectionType<TSingle> = TSingle[],
> extends CollectionStore<TApi, TSingle, TCollection> {
  _collection: TCollection = [] as unknown as TCollection;
  // _crudConfig: CrudConfig = {};

  constructor(name: string) {
    super(name);
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
   * @param {CrudFetchOptions} [options={}] - Options for the fetch operation, e.g., `useCache`.
   * @returns {Promise<TSingle | ArrayElement<TCollection> | undefined>} A promise resolving to the fetched item, or undefined if not found/error.
   * @flow
   */
  _fetch = flow(
    toFlowGeneratorFunction(
      async <
        Endpoint extends keyof TApi = keyof TApi,
        // @ts-expect-error marks as error but works
        Args extends Parameters<TApi[Endpoint]>[0] = Parameters<
          // @ts-expect-error marks as error but works
          TApi[Endpoint]
        >[0],
      >(
        endpoint: Endpoint,
        args: Args extends undefined // Ensure args is not undefined if Endpoint expects no args, then make it required with id
          ? never // Should not happen if endpoint expects no args, but types demand it
          : Args & {
              // If Args is defined, ensure it includes id
              id: ArrayElement<TCollection>['id'];
            },
        { useCache = false }: CrudFetchOptions = {},
      ) => {
        let item: TSingle | ArrayElement<TCollection> | undefined;
        if (useCache)
          item = await new Promise((resolve) => resolve(this.getById(args.id)));
        if (!useCache || !item) {
          item = (await this.apiCall<TApi>(endpoint, args)) as unknown as
            | TSingle
            | undefined;
          if (!item) return;
          this.setItem(item);
        }
        return item;
      },
    ),
  );

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
  _fetchAll = flow(
    toFlowGeneratorFunction(
      async <
        Endpoint extends keyof TApi,
        // @ts-expect-error marks as error but works
        Args extends Parameters<TApi[Endpoint]>[0] = Parameters<
          // @ts-expect-error marks as error but works
          TApi[Endpoint]
        >[0],
      >(
        endpoint: Endpoint,
        args: Args extends undefined ? never : Args,
        { useCache = false }: CrudFetchOptions = {},
      ) => {
        let items: TCollection | undefined;
        if (useCache && this.collection.length > 0) {
          // Check if collection has items for cache to be useful
          items = await new Promise((resolve) => resolve(this.collection));
        }
        if (!useCache || !items) {
          items = (await this.apiCall<TApi>(endpoint, args)) as unknown as
            | TCollection
            | undefined;
          if (items) {
            // Only set collection if API call was successful and returned items
            this.setCollection(items);
          } else {
            // Optionally handle cases where API returns null/undefined for a collection (e.g., set to empty array)
            this.setCollection([] as unknown as TCollection);
            console.warn(
              `[${this.name}] API call returned null/undefined for collection`,
            );
          }
        }
        return items;
      },
    ),
  );

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
  _create = flow(
    toFlowGeneratorFunction(
      async <
        Endpoint extends keyof TApi,
        // @ts-expect-error marks as error but works
        Args extends Parameters<TApi[Endpoint]>[0] = Parameters<
          // @ts-expect-error marks as error but works
          TApi[Endpoint]
        >[0],
      >(
        endpoint: Endpoint,
        args: Args extends undefined ? never : Args,
      ) => {
        // Assuming the result of apiCall is the created item of type TSingle or compatible
        const item = await this.apiCall<TApi>(endpoint, args);
        if (item) {
          this.addItem(item as TSingle); // Cast to TSingle if `apiCall` returns broader type like `any`
        } else {
          throw new Error('Create Endpoint did not return an item');
        }
        return item;
      },
    ),
  );

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
  _update = flow(
    toFlowGeneratorFunction(
      async <
        Endpoint extends keyof TApi,
        // @ts-expect-error marks as error but works
        Args extends Parameters<TApi[Endpoint]>[0] = Parameters<
          // @ts-expect-error marks as error but works
          TApi[Endpoint]
        >[0],
      >(
        endpoint: Endpoint,
        args: Args extends undefined ? never : Args,
      ) => {
        // Assuming the result of apiCall is the updated item of type TSingle or compatible
        const item = await this.apiCall<TApi>(endpoint, args);
        if (item) {
          this.editItem(item as TSingle); // Cast to TSingle if `apiCall` returns broader type
        } else {
          throw new Error('Update Endpoint did not return an item');
        }
        return item;
      },
    ),
  );

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
  _delete = flow(
    toFlowGeneratorFunction(
      async <
        Endpoint extends keyof TApi,
        // @ts-expect-error marks as error but works
        Args extends Parameters<TApi[Endpoint]>[0] = Parameters<
          // @ts-expect-error marks as error but works
          TApi[Endpoint]
        >[0],
      >(
        endpoint: Endpoint,
        args: Args extends undefined // Ensure args is not undefined if Endpoint expects no args
          ? never // Should not happen, but types demand id for removeItem
          : Args & {
              // If Args is defined, ensure it includes id for removeItem
              id: ArrayElement<TCollection>['id'];
            },
      ) => {
        await this.apiCall<TApi>(endpoint, args);
        this.removeItem(args.id);
      },
    ),
  );
}
