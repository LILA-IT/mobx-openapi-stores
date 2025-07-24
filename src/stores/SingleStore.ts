import { action, computed, makeObservable, observable } from 'mobx';

import { ApiStore } from './ApiStore';
import { type ApiConfig, type ApiType } from '../types/ApiType';
import { type SingleType } from 'src/types';

/**
 * @class SingleStore
 * @template TApi - The type of the generated API client, inherited from `ApiStore`.
 * @template TSingle - The type of the single entity this store manages. Must conform to `SingleType`.
 * @description A base store for managing a single observable entity or data item (e.g., a currently selected user, active document).
 * It extends `ApiStore` to inherit API communication capabilities.
 *
 * @extends ApiStore<TApi>
 *
 * @property {TSingle | null} current - A computed property providing access to the current observable entity (`_current`).
 *                                     It's null if no entity is set.
 *
 * @method setCurrent - Action to set or clear the current entity.
 *                      Pass a `TSingle` object to set it, or `null` to clear it.
 *
 * @example
 * // Assuming User is a type { id: string, name: string } and UserApi is the API client type
 * class CurrentUserStore extends SingleStore<UserApi, User> {
 *   constructor() {
 *     super('CurrentUserStore');
 *     // makeObservable is called in SingleStore for _current, current, setCurrent
 *   }
 *
 *   // initApi would be implemented here to set up UserApi
 *   initApi(config: UserApiConfig) { this.setApi(new UserApi(config)); }
 *
 *   async loadUser(userId: string) {
 *     const user = await this.apiCall('getUserById', { userId }); // Assuming 'getUserById' is a method on UserApi
 *     if (user) {
 *       this.setCurrent(user as User);
 *     }
 *   }
 *
 *   clearUser() {
 *     this.setCurrent(null);
 *   }
 * }
 */
export class SingleStore<
  TApi extends ApiType,
  TSingle extends SingleType,
> extends ApiStore<TApi> {
  /**
   * @protected
   * @property {TSingle | null} _current - The internal observable property holding the current entity.
   * @observable
   */
  _current: TSingle | null = null;

  constructor({
    name,
    apiConstructor,
  }: {
    name: string;
    apiConstructor: (config: ApiConfig<TApi>) => TApi;
  }) {
    super({ name, apiConstructor });
    makeObservable(this, {
      _current: observable,
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
    this._current = newCurrent;
  }

  /**
   * @property current
   * @description Computed property that provides access to the current observable entity.
   * @returns {TSingle | null} The current entity, or `null` if no entity is set.
   * @computed
   */
  get current() {
    return this._current;
  }
}
