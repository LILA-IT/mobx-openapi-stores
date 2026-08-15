import { reaction } from 'mobx';
import { expect, vi, type Mock } from 'vitest';

/**
 * Shared MobX reactivity helpers for Wave A store tests.
 *
 * Budget conventions:
 * - Meaningful change → expect **1** fire by default (`expectBudget(observer, 1)`).
 * - Intentional no-op → expect **0** fires (`expectBudget(observer, 0)`).
 * - Override N case-by-case when an API intentionally touches a signal more than once;
 *   document N in the test title.
 */

export type ObserveHandle<T> = {
  observer: Mock<(value: T, previous: T | undefined) => void>;
  dispose: () => void;
  /** Number of times the reaction effect ran after setup. */
  get calls(): number;
};

/**
 * Tracks a derived signal with MobX `reaction`.
 * Does not fire on the initial value (effect only runs on subsequent changes).
 */
export function observeSignal<T>(
  read: () => T,
  options?: { equals?: (a: T, b: T) => boolean },
): ObserveHandle<T> {
  const observer = vi.fn<(value: T, previous: T | undefined) => void>();
  const dispose = reaction(read, observer, {
    equals: options?.equals,
  });

  return {
    observer,
    dispose,
    get calls() {
      return observer.mock.calls.length;
    },
  };
}

/**
 * Asserts the reaction fired exactly `expected` times (notification budget).
 */
export function expectBudget(
  handle: Pick<ObserveHandle<unknown>, 'calls' | 'observer'>,
  expected: number,
): void {
  expect(handle.calls).toBe(expected);
}

/**
 * Runs `mutate` while watching a multi-signal snapshot.
 * Asserts budget on the combined snapshot and that every observed value
 * satisfies `assertConsistent` (atomicity / no half-updated reads).
 */
export function expectAtomic<TSnapshot>(options: {
  readSnapshot: () => TSnapshot;
  mutate: () => void;
  assertConsistent: (snapshot: TSnapshot) => void;
  /** Expected fires for the combined snapshot. Default 1. */
  expectedBudget?: number;
  equals?: (a: TSnapshot, b: TSnapshot) => boolean;
}): void {
  const expectedBudget = options.expectedBudget ?? 1;
  const handle = observeSignal(options.readSnapshot, { equals: options.equals });

  options.mutate();

  expectBudget(handle, expectedBudget);
  for (const [value] of handle.observer.mock.calls) {
    options.assertConsistent(value);
  }

  options.assertConsistent(options.readSnapshot());
  handle.dispose();
}
