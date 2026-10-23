import { action, computed, makeObservable, observable } from 'mobx';
import type { ObservableMap } from 'mobx';

/** Default key used by unscoped {@link LoadingStore.beginLoading} / {@link LoadingStore.endLoading}. */
export const DEFAULT_LOADING_KEY = '*';

/**
 * Ticket returned by {@link LoadingStore.beginLoading}. Pass it to
 * {@link LoadingStore.endLoading} so absolute clears invalidate stale ends.
 */
export type LoadingTicket = {
  key: string;
  epoch: number;
};

/**
 * Tracks loading with per-key reference counts.
 * Prefer balanced {@link beginLoading} and {@link endLoading} calls for overlapping work.
 */
export class LoadingStore {
  #loadingCounts: ObservableMap<string, number> = observable.map();

  /**
   * Bumped by absolute {@link setIsLoading}(false). Stale tickets no-op on end.
   * @private
   */
  #loadingEpoch = 0;

  /**
   * @constructor
   * @description Creates a new LoadingStore with no active loading keys.
   */
  constructor() {
    makeObservable(this, {
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
   * @returns {LoadingTicket} Pass to {@link endLoading} when the work finishes.
   * @action
   */
  beginLoading = (key: string = DEFAULT_LOADING_KEY): LoadingTicket => {
    const ticket: LoadingTicket = { key, epoch: this.#loadingEpoch };
    this.#loadingCounts.set(key, (this.#loadingCounts.get(key) ?? 0) + 1);
    return ticket;
  };

  /**
   * @method endLoading
   * @description Decrements a loading holder. Prefer the ticket from
   * {@link beginLoading}. A string key remains supported for simple cases.
   * Tickets from before an absolute clear are ignored; if the only remaining
   * holder is the default key (sticky `setIsLoading(true)` after clear), it is
   * cleared when the abandoned work finishes.
   * @param {string | LoadingTicket} [keyOrTicket=DEFAULT_LOADING_KEY]
   * @action
   */
  endLoading = (keyOrTicket: string | LoadingTicket = DEFAULT_LOADING_KEY) => {
    if (typeof keyOrTicket !== 'string') {
      if (keyOrTicket.epoch !== this.#loadingEpoch) {
        this.#clearStickyDefaultAfterAbandonedEnd();
        return;
      }
      this.#decrementKey(keyOrTicket.key);
      return;
    }
    this.#decrementKey(keyOrTicket);
  };

  /**
   * @method isLoadingFor
   * @description Returns true when `key` has at least one active loading holder.
   * @param {string} key - Loading scope key.
   * @returns {boolean}
   */
  isLoadingFor = (key: string) => (this.#loadingCounts.get(key) ?? 0) > 0;

  /**
   * @method setIsLoading
   * @description Absolute loading update. `true` ensures the default key has at
   * least one holder when nothing is loading; `false` clears all keys and
   * invalidates in-flight loading tickets.
   * Prefer begin/end for overlapping work.
   * @param {boolean} isLoading - Desired absolute loading state.
   * @action
   */
  setIsLoading = (isLoading: boolean) => {
    if (isLoading) {
      if (!this.#hasHolders()) this.beginLoading(DEFAULT_LOADING_KEY);
      return;
    }
    this.#loadingEpoch += 1;
    this.#loadingCounts.clear();
  };

  /**
   * @property isLoading
   * @description True when at least one loading holder is active on any key.
   * @returns {boolean}
   * @computed
   */
  get isLoading() {
    return this.#hasHolders();
  }

  /** Reads internal counts only, so overriding `isLoading` cannot affect store logic. */
  #hasHolders() {
    for (const count of this.#loadingCounts.values()) {
      if (count > 0) return true;
    }
    return false;
  }

  #decrementKey(key: string) {
    const next = Math.max(0, (this.#loadingCounts.get(key) ?? 0) - 1);
    if (next === 0) this.#loadingCounts.delete(key);
    else this.#loadingCounts.set(key, next);
  }

  #clearStickyDefaultAfterAbandonedEnd() {
    if (this.#loadingCounts.size !== 1) return;
    if (!((this.#loadingCounts.get(DEFAULT_LOADING_KEY) ?? 0) > 0)) return;
    this.#decrementKey(DEFAULT_LOADING_KEY);
  }
}
