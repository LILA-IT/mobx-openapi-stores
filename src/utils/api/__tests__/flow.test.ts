import { flow } from 'mobx';
import { describe, expect, it } from 'vitest';

import { toFlowGeneratorFunction } from '../flow';

describe('toFlowGeneratorFunction', () => {
  it('wraps an async function for MobX flow and preserves the return value', async () => {
    const run = flow(
      toFlowGeneratorFunction((n: number) => {
        return Promise.resolve(n * 2);
      }),
    );

    await expect(run(21)).resolves.toBe(42);
  });

  it('supports yield* so the yielded value is typed and awaited', async () => {
    const double = toFlowGeneratorFunction((n: number) => Promise.resolve(n * 2));

    const run = flow(function* (n: number) {
      const value: number = yield* double(n);
      return value + 1;
    });

    await expect(run(3)).resolves.toBe(7);
  });

  it('accepts sync return values', async () => {
    const run = flow(toFlowGeneratorFunction((label: string) => label.toUpperCase()));
    await expect(run('ok')).resolves.toBe('OK');
  });
});
