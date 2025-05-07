import { describe, expect, it } from 'vitest';

import { ApiStore } from '..';
import { BaseAPI } from 'src/openapi-generator';

describe('ApiStore', () => {
  it('should be a class', () => {
    expect(typeof ApiStore).toBe('function');
  });

  it('should have a constructor', () => {
    expect(ApiStore.prototype.constructor).toBeDefined();
  });

  const store = new ApiStore<BaseAPI>('TestStore');

  it('should have a name property', () => {
    expect(store.name).toBeDefined();
    expect(store.name).toBe('TestStore');
  });

  it('should have an api property', () => {
    expect(store.api).toBeDefined();
    expect(store.api).toBe(null);
  });

  it('should have a setApi method', () => {
    expect(store.setApi).toBeDefined();
  });

  it('should set the api property', () => {
    const api = { test: 'testAPI' } as unknown as BaseAPI;
    store.setApi(api);
    expect(store.api).toMatchObject(api);
  });
});
