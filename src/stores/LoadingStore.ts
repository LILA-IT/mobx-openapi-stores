import { action, computed, makeObservable, observable } from 'mobx';

/**
 * @class LoadingStore
 * @description Base class for managing a simple loading state.
 * It provides an observable `_isLoading` property and a computed `isLoading` getter,
 * along with an action `setIsLoading` to modify the loading state.
 *
 * This store is typically extended by other stores that need to indicate
 * asynchronous operations are in progress.
 *
 * @property {boolean} isLoading - A computed property that returns the current loading state.
 * @method setIsLoading - Action to set the loading state of the store.
 *
 * @example
 * // Extending LoadingStore for custom data management
 * class MyDataStore extends LoadingStore {
 *   constructor() {
 *     super();
 *     makeObservable(this, { fetchData: action });
 *   }
 *
 *   async fetchData() {
 *     this.setIsLoading(true);
 *     try {
 *       // ... perform async operation ...
 *     } finally {
 *       this.setIsLoading(false);
 *     }
 *   }
 * }
 *
 * @example
 * // Direct usage for simple loading tracking
 * const loadingStore = new LoadingStore();
 * loadingStore.setIsLoading(true);
 * // ... perform operation ...
 * loadingStore.setIsLoading(false);
 */

export class LoadingStore {
  /**
   * @protected
   * @property {boolean} _isLoading - The internal observable property holding the loading state.
   * @observable
   */
  _isLoading = false;

  /**
   * @constructor
   * @description Creates a new LoadingStore instance with loading state initialized to false.
   */
  constructor() {
    makeObservable(this, {
      _isLoading: observable,
      isLoading: computed,
      setIsLoading: action,
    });
  }

  /**
   * @method setIsLoading
   * @description Sets the loading state of the store.
   * @param {boolean} isLoading - True to indicate loading, false otherwise.
   * @action
   */
  setIsLoading = (isLoading: boolean) => {
    this._isLoading = isLoading;
  };

  /**
   * @property isLoading
   * @description Computed property that returns the current loading state.
   * @returns {boolean} True if the store is currently in a loading state, false otherwise.
   * @computed
   */
  get isLoading() {
    return this._isLoading;
  }
}
