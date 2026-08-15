import { describe, expect, it } from 'vitest';
import * as MobX from 'mobx';

import { actionBoundCompat } from '../actionBoundCompat';

describe('actionBoundCompat', () => {
  it('resolves to MobX 7 actionBound or MobX 6 action.bound', () => {
    const mobx7 = MobX as typeof MobX & { actionBound?: typeof MobX.action };
    const expected =
      typeof mobx7.actionBound === 'function'
        ? mobx7.actionBound
        : (MobX.action as typeof MobX.action & { bound: typeof MobX.action }).bound;

    expect(actionBoundCompat).toBe(expected);
    expect(typeof actionBoundCompat).toBe('function');
  });
});
