import { describe, expect, it } from 'vitest';

import { type ApiType } from '../../types';
import { SingleStore } from '../SingleStore';

type Entity = {
  id: number;
  name: string;
};

function createStore(): SingleStore<ApiType, Entity> {
  return new SingleStore<ApiType, Entity>('SingleStoreTest');
}

describe('SingleStore', () => {
  it('starts with current null', () => {
    const store = createStore();

    expect(store.current).toBeNull();
  });

  it('setCurrent sets the current entity', () => {
    const store = createStore();

    store.setCurrent({ id: 1, name: 'Alice' });

    expect(store.current).toEqual({ id: 1, name: 'Alice' });
  });

  it('setCurrent clears current when given null', () => {
    const store = createStore();
    store.setCurrent({ id: 1, name: 'Alice' });

    store.setCurrent(null);

    expect(store.current).toBeNull();
  });

  it('setCurrent(null) when already null leaves current null', () => {
    const store = createStore();
    expect(store.current).toBeNull();

    store.setCurrent(null);

    expect(store.current).toBeNull();
  });

  it('setCurrent replaces a previous entity', () => {
    const store = createStore();
    store.setCurrent({ id: 1, name: 'Alice' });

    store.setCurrent({ id: 2, name: 'Bob' });

    expect(store.current).toEqual({ id: 2, name: 'Bob' });
  });
});
