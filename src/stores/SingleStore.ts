import { action, computed, makeObservable, observable } from 'mobx';

import { ApiStore } from './ApiStore';
import { type ApiType } from '../types/ApiType';

export type SingleType = { id: number | string };

export class SingleStore<
  TApi extends ApiType,
  TSingle extends SingleType,
> extends ApiStore<TApi> {
  _current: TSingle | null = null;

  constructor(name: string) {
    super(name);
    makeObservable(this, {
      _current: observable,
      current: computed,
      setCurrent: action,
    });
  }

  setCurrent(newCurrent: TSingle | null) {
    this._current = newCurrent;
  }

  get current() {
    return this._current;
  }
}
