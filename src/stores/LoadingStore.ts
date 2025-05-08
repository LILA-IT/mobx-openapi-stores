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
 * @example
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
 */

export class LoadingStore {
  _isLoading = false;

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
