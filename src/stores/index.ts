/**
 * @fileoverview MobX OpenAPI Stores - A collection of MobX stores for managing API state
 *
 * This package provides a set of pre-built MobX stores that simplify the management of API state
 * in React applications. The stores offer both simple and advanced patterns for different use cases.
 *
 * @example
 * // Import individual stores
 * import { ApiStore, CrudCollectionStore } from 'mobx-openapi-stores';
 *
 * @example
 * // Create a simple API store with createApi function
 * const userStore = new ApiStore({
 *   name: 'UserStore',
 *   createApi: (config) => new UserApi(config)
 * });
 *
 * @example
 * // Extend CrudCollectionStore for full CRUD operations
 * class ProductStore extends CrudCollectionStore<ProductApi, Product> {
 *   constructor() {
 *     super('ProductStore');
 *   }
 *
 *   initApi(config) {
 *     this.setApi(new ProductApi(config));
 *   }
 * }
 */

import { ApiStore } from './ApiStore';
import { CollectionStore } from './CollectionStore';
import { CrudCollectionStore } from './CrudCollectionStore';
import { LoadingStore } from './LoadingStore';
import { ObjectStore } from './ObjectStore';
import { SingleStore } from './SingleStore';

/**
 * @exports ApiStore - Base store for managing an API client instance and making API calls
 * @exports LoadingStore - Simple loading state management store
 * @exports SingleStore - Store for managing a single observable entity with API capabilities
 * @exports CollectionStore - Store for managing a collection of observable entities
 * @exports CrudCollectionStore - Advanced store with built-in CRUD operation helpers
 * @exports ObjectStore - Store for managing dictionary-like observable objects with keyed entries
 */
export {
  ApiStore,
  LoadingStore,
  CollectionStore,
  CrudCollectionStore,
  SingleStore,
  ObjectStore,
};
