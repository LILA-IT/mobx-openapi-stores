import { describe, expect, it } from 'vitest';

import { LoadingStore } from '../LoadingStore';

describe('LoadingStore', () => {
  it('should be a class', () => {
    expect(typeof LoadingStore).toBe('function');
  });

  it('should have a constructor', () => {
    expect(LoadingStore.prototype.constructor).toBeDefined();
  });

  const store = new LoadingStore();

  it('should have a loading property', () => {
    expect(store.isLoading).toBeDefined();
  });

  it('should have a setIsLoading method', () => {
    expect(store.setIsLoading).toBeDefined();
  });

  it('should set the loading property', () => {
    store.setIsLoading(true);
    expect(store.isLoading).toBe(true);
    store.setIsLoading(false);
    expect(store.isLoading).toBe(false);
  });
});
