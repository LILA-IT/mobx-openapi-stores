import { action, makeObservable } from 'mobx';
import { describe, expect, it } from 'vitest';

import { type ApiType } from '../../types';
import { SingleStore } from '../SingleStore';
import { expectAtomic, expectBudget, observeSignal } from './helpers/reactivity';

type Entity = {
  id: number;
  name: string;
};

function createStore(): SingleStore<ApiType, Entity> {
  return new SingleStore<ApiType, Entity>('SingleStoreReactivityTest');
}

/**
 * Tiny subclass so setIsLoading + setCurrent run in one outer action
 * (MobX batches nested actions → single combined snapshot notify).
 */
class AtomicSingleStore extends SingleStore<ApiType, Entity> {
  constructor() {
    super('AtomicSingleStoreTest');
    makeObservable(this, {
      finishLoad: action,
    });
  }

  finishLoad(entity: Entity) {
    this.setIsLoading(false);
    this.setCurrent(entity);
  }
}

describe('SingleStore reactivity', () => {
  it('notifies once (N=1) on meaningful setCurrent', () => {
    const store = createStore();
    const handle = observeSignal(() => store.current);

    store.setCurrent({ id: 1, name: 'Alice' });

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Alice' }),
      null,
      expect.anything(),
    );
    handle.dispose();
  });

  it('notifies once (N=1) when clearing a set current', () => {
    const store = createStore();
    store.setCurrent({ id: 1, name: 'Alice' });
    const handle = observeSignal(() => store.current);

    store.setCurrent(null);

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ id: 1, name: 'Alice' }),
      expect.anything(),
    );
    handle.dispose();
  });

  it('does not notify (N=0) when setCurrent(null) and current is already null', () => {
    const store = createStore();
    const handle = observeSignal(() => store.current);

    store.setCurrent(null);

    expectBudget(handle, 0);
    handle.dispose();
  });

  it('does not notify (N=0) when setCurrent receives the identical current reference', () => {
    const store = createStore();
    store.setCurrent({ id: 1, name: 'Alice' });
    const current = store.current;
    const handle = observeSignal(() => store.current);

    store.setCurrent(current);

    expectBudget(handle, 0);
    handle.dispose();
  });

  it('notifies once (N=1) when setCurrent wraps the same plain object again', () => {
    // setCurrent always runs observable(newCurrent); a plain object yields a new
    // proxy each time, so identity-based reactions still fire.
    const store = createStore();
    const entity = { id: 1, name: 'Alice' };
    store.setCurrent(entity);
    const handle = observeSignal(() => store.current);

    store.setCurrent(entity);

    expectBudget(handle, 1);
    handle.dispose();
  });

  it('applies setIsLoading + setCurrent atomically via one @action (N=1)', () => {
    const store = new AtomicSingleStore();
    store.setIsLoading(true);

    expectAtomic({
      readSnapshot: () => ({
        current: store.current,
        isLoading: store.isLoading,
      }),
      mutate: () => {
        store.finishLoad({ id: 1, name: 'Alice' });
      },
      assertConsistent: (snapshot) => {
        // After the batched action, loading is off only with current set.
        if (!snapshot.isLoading) {
          expect(snapshot.current).toEqual({ id: 1, name: 'Alice' });
        }
        if (snapshot.current === null) {
          expect(snapshot.isLoading).toBe(true);
        }
      },
      expectedBudget: 1,
    });

    expect(store.isLoading).toBe(false);
    expect(store.current).toEqual({ id: 1, name: 'Alice' });
  });
});
