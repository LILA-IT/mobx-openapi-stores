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
 * @class LoadingStore
 * @description Base class for managing loading state with per-key reference counts.
 * {@link isLoading} is true while any key has a count greater than zero.
 * {@link isLoadingFor} reports a single key.
 *
 * Prefer {@link beginLoading} / {@link endLoading} for nested or overlapping
 * async work (e.g. `apiCall`). {@link setIsLoading} remains for absolute
 * updates: `true` ensures at least one holder on the default key; `false`
 * clears all keys and bumps an epoch so in-flight `endLoading` tickets no-op.
 *
 * If `setIsLoading(true)` runs after an absolute clear while older calls are
 * still finishing, those stale ends clear a lone default-key holder so
 * `isLoading` does not stick true.
 *
 * @property {boolean} isLoading - Whether any loading holder is active.
 * @method isLoadingFor - Whether a specific key has an active holder.
 * @method beginLoading - Increments the loading count for a key; returns a ticket.
 * @method endLoading - Decrements via ticket (preferred) or key string.
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
   * @returns {LoadingTicket} Pass to {@link endLoading} when the work finishes.
   * @action
   */
  beginLoading = (key: string = DEFAULT_LOADING_KEY): LoadingTicket => {
    const ticket: LoadingTicket = { key, epoch: this.#loadingEpoch };
    this._loadingCounts.set(key, (this._loadingCounts.get(key) ?? 0) + 1);
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
  isLoadingFor = (key: string) => (this._loadingCounts.get(key) ?? 0) > 0;

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
      if (!this.isLoading) this.beginLoading(DEFAULT_LOADING_KEY);
      return;
    }
    this.#loadingEpoch += 1;
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

  #decrementKey(key: string) {
    const next = Math.max(0, (this._loadingCounts.get(key) ?? 0) - 1);
    if (next === 0) this._loadingCounts.delete(key);
    else this._loadingCounts.set(key, next);
  }

  #clearStickyDefaultAfterAbandonedEnd() {
    if (this._loadingCounts.size !== 1) return;
    if (!this.isLoadingFor(DEFAULT_LOADING_KEY)) return;
    this.#decrementKey(DEFAULT_LOADING_KEY);
  }
}
