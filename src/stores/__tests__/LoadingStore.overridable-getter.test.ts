import { describe, expect, it } from 'vitest';

import { type ApiType } from '../../types';
import { ApiStore } from '../ApiStore';
import { DEFAULT_LOADING_KEY, LoadingStore } from '../LoadingStore';

describe('overriding isLoading in subclasses', () => {
  it('does not call an overridden isLoading while ApiStore is constructing', () => {
    class Parent extends ApiStore<ApiType> {
      child = { isLoading: false };

      constructor() {
        super('Parent');
      }

      override get isLoading() {
        // `child` does not exist yet during super(); would throw if called there.
        return this.child.isLoading;
      }
    }

    expect(() => new Parent()).not.toThrow();
    expect(new Parent().isLoading).toBe(false);
  });

  it('does not call an overridden isLoading from setIsLoading', () => {
    let reads = 0;
    class Aggregating extends LoadingStore {
      override get isLoading() {
        reads += 1;
        return false;
      }
    }
    const store = new Aggregating();
    reads = 0;

    store.setIsLoading(true);
    store.setIsLoading(true);

    expect(reads).toBe(0);
    expect(store.isLoadingFor(DEFAULT_LOADING_KEY)).toBe(true);
  });
});
