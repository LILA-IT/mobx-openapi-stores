import { describe, expect, it } from 'vitest';

import { LoadingStore } from '../LoadingStore';
import { expectBudget, observeSignal } from './helpers/reactivity';

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

describe('LoadingStore reactivity', () => {
  it('setIsLoading(true) notifies isLoading once (budget N=1)', () => {
    const store = new LoadingStore();
    const handle = observeSignal(() => store.isLoading);

    store.setIsLoading(true);

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(true, false, expect.anything());
    expect(store.isLoading).toBe(true);
    handle.dispose();
  });

  it('setIsLoading(false) notifies isLoading once (budget N=1)', () => {
    const store = new LoadingStore();
    store.setIsLoading(true);
    const handle = observeSignal(() => store.isLoading);

    store.setIsLoading(false);

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(false, true, expect.anything());
    expect(store.isLoading).toBe(false);
    handle.dispose();
  });

  it('setIsLoading with the same value is a no-op (budget N=0; MobX Object.is)', () => {
    const store = new LoadingStore();
    store.setIsLoading(true);
    const handle = observeSignal(() => store.isLoading);

    store.setIsLoading(true);

    expectBudget(handle, 0);
    expect(store.isLoading).toBe(true);
    handle.dispose();
  });
});
