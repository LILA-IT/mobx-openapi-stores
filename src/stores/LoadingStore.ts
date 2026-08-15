import { action, computed, makeObservable, observable } from 'mobx';
import type { ObservableMap } from 'mobx';

/** Default key used by unscoped {@link LoadingStore.beginLoading} / {@link LoadingStore.endLoading}. */
export const DEFAULT_LOADING_KEY = '*';

/**
 * @class LoadingStore
 * @description Base class for managing loading state with per-key reference counts.
 * {@link isLoading} is true while any key has a count greater than zero.
 * {@link isLoadingFor} reports a single key.
 *
 * Prefer {@link beginLoading} / {@link endLoading} for nested or overlapping
 * async work (e.g. `apiCall`). {@link setIsLoading} remains for absolute
 * updates: `true` ensures at least one holder on the default key; `false`
 * clears all keys.
 *
 * @property {boolean} isLoading - Whether any loading holder is active.
 * @method isLoadingFor - Whether a specific key has an active holder.
 * @method beginLoading - Increments the loading count for a key.
 * @method endLoading - Decrements the loading count for a key (floored at 0).
 * @method setIsLoading - Absolute set: `true` ensures loading; `false` clears all.
 */
export class LoadingStore {
  /**
   * @protected
   * @property {ObservableMap<string, number>} _loadingCounts - Active holders by key.
   * @observable
   */
  _loadingCounts: ObservableMap<string, number> = observable.map();

  /**
   * @constructor
   * @description Creates a new LoadingStore with no active loading keys.
   */
  constructor() {
    makeObservable(this, {
      _loadingCounts: observable,
      isLoading: computed,
      beginLoading: action,
      endLoading: action,
      setIsLoading: action,
      isLoadingFor: false,
    });
  }

  /**
   * @method beginLoading
   * @description Increments the loading reference count for `key`.
   * @param {string} [key=DEFAULT_LOADING_KEY] - Loading scope key.
   * @action
   */
  beginLoading = (key: string = DEFAULT_LOADING_KEY) => {
    this._loadingCounts.set(key, (this._loadingCounts.get(key) ?? 0) + 1);
  };

  /**
   * @method endLoading
   * @description Decrements the loading reference count for `key` (never below 0).
   * @param {string} [key=DEFAULT_LOADING_KEY] - Loading scope key.
   * @action
   */
  endLoading = (key: string = DEFAULT_LOADING_KEY) => {
    const next = Math.max(0, (this._loadingCounts.get(key) ?? 0) - 1);
    if (next === 0) this._loadingCounts.delete(key);
    else this._loadingCounts.set(key, next);
  };

  /**
   * @method isLoadingFor
   * @description Returns true when `key` has at least one active loading holder.
   * @param {string} key - Loading scope key.
   * @returns {boolean}
   */
  isLoadingFor = (key: string) => (this._loadingCounts.get(key) ?? 0) > 0;

  /**
   * @method setIsLoading
   * @description Absolute loading update. `true` ensures the default key has at
   * least one holder when nothing is loading; `false` clears all keys.
   * Prefer begin/end for overlapping work.
   * @param {boolean} isLoading - Desired absolute loading state.
   * @action
   */
  setIsLoading = (isLoading: boolean) => {
    if (isLoading) {
      if (!this.isLoading) this.beginLoading(DEFAULT_LOADING_KEY);
      return;
    }
    this._loadingCounts.clear();
  };

  /**
   * @property isLoading
   * @description True when at least one loading holder is active on any key.
   * @returns {boolean}
   * @computed
   */
  get isLoading() {
    for (const count of this._loadingCounts.values()) {
      if (count > 0) return true;
    }
    return false;
  }
}
