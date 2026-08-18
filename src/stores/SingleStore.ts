import { action, computed, makeObservable, observable, set } from 'mobx';

import { ApiStore } from './ApiStore';
import { type ApiConfig, type ApiType } from '../types/ApiType';
import { type SingleType } from '../types';

/** Store for one observable entity, layered on top of {@link ApiStore}. */
export class SingleStore<
  TApi extends ApiType,
  TSingle extends SingleType,
> extends ApiStore<TApi> {
  #current = observable.object({ value: null as TSingle | null });

  /** Creates a store from a name or API factory options. */
  constructor(
    nameOrOptions?:
      string | { name?: string; createApi?: (config: ApiConfig<TApi>) => TApi },
  ) {
    super(nameOrOptions); // Pass through to ApiStore which handles the parsing

    makeObservable(this, {
      current: computed,
      setCurrent: action,
    });
  }

  /**
   * @method setCurrent
   * @description Sets or clears the current observable entity.
   * @param {TSingle | null} newCurrent - The entity to set as current, or null to clear the current entity.
   * @action
   */
  setCurrent(newCurrent: TSingle | null) {
    if (newCurrent === null) {
      set(this.#current, 'value', null);
    } else {
      // Make the object deeply observable when setting it
      set(this.#current, 'value', observable(newCurrent));
    }
  }

  /**
   * @property current
   * @description Computed property that provides access to the current observable entity.
   * @returns {TSingle | null} The current entity, or `null` if no entity is set.
   * @computed
   */
  get current() {
    return this.#current.value;
  }
}
