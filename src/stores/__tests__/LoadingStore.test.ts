import { describe, expect, it } from 'vitest';

import { LoadingStore, DEFAULT_LOADING_KEY } from '../LoadingStore';
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

  it('setIsLoading with the same value is a no-op (budget N=0)', () => {
    const store = new LoadingStore();
    store.setIsLoading(true);
    const handle = observeSignal(() => store.isLoading);

    store.setIsLoading(true);

    expectBudget(handle, 0);
    expect(store.isLoading).toBe(true);
    handle.dispose();
  });

  it('beginLoading/endLoading keeps isLoading true until the last holder ends', () => {
    const store = new LoadingStore();
    const handle = observeSignal(() => store.isLoading);

    store.beginLoading();
    store.beginLoading();
    expect(store.isLoading).toBe(true);
    expectBudget(handle, 1);

    store.endLoading();
    expect(store.isLoading).toBe(true);
    expectBudget(handle, 1);

    store.endLoading();
    expect(store.isLoading).toBe(false);
    expectBudget(handle, 2);
    handle.dispose();
  });

  it('isLoadingFor isolates keys while isLoading is any-key', () => {
    const store = new LoadingStore();
    const anyHandle = observeSignal(() => store.isLoading);
    const keyHandle = observeSignal(() => store.isLoadingFor('fetchAll'));

    store.beginLoading('fetchAll');
    expect(store.isLoadingFor('fetchAll')).toBe(true);
    expect(store.isLoadingFor('create')).toBe(false);
    expect(store.isLoading).toBe(true);
    expectBudget(anyHandle, 1);
    expectBudget(keyHandle, 1);

    store.beginLoading('create');
    expect(store.isLoadingFor('create')).toBe(true);
    expectBudget(anyHandle, 1);
    expectBudget(keyHandle, 1);

    store.endLoading('fetchAll');
    expect(store.isLoadingFor('fetchAll')).toBe(false);
    expect(store.isLoading).toBe(true);
    expectBudget(keyHandle, 2);
    expectBudget(anyHandle, 1);

    store.endLoading('create');
    expect(store.isLoading).toBe(false);
    expectBudget(anyHandle, 2);
    anyHandle.dispose();
    keyHandle.dispose();
  });

  it('setIsLoading(false) clears all keyed holders', () => {
    const store = new LoadingStore();
    store.beginLoading('a');
    store.beginLoading('b');

    store.setIsLoading(false);

    expect(store.isLoading).toBe(false);
    expect(store.isLoadingFor('a')).toBe(false);
    expect(store.isLoadingFor('b')).toBe(false);
  });

  it('stale endLoading ticket after absolute clear drops a lone default holder', () => {
    const store = new LoadingStore();
    const ticket = store.beginLoading('fetch');
    store.setIsLoading(false);
    store.setIsLoading(true);
    expect(store.isLoadingFor(DEFAULT_LOADING_KEY)).toBe(true);

    store.endLoading(ticket);

    expect(store.isLoading).toBe(false);
    expect(store.isLoadingFor(DEFAULT_LOADING_KEY)).toBe(false);
  });
});
