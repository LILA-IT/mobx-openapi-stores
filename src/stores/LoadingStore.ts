import { action, computed, makeObservable, observable } from 'mobx';

export class LoadingStore {
  _isLoading = false;

  constructor() {
    makeObservable(this, {
      _isLoading: observable,
      isLoading: computed,
      setIsLoading: action,
    });
  }

  setIsLoading = (isLoading: boolean) => {
    this._isLoading = isLoading;
  };

  get isLoading() {
    return this._isLoading;
  }
}
