/**
 * Converts a promise-returning function into a MobX `flow`-compatible generator.
 *
 * Adapted from `to-flow-generator-function` (MIT, © 2023 harunou /
 * https://github.com/harunou/to-flow-generator-function) so this package has
 * zero direct runtime dependencies beyond its peer (mobx).
 */
export type FlowGenerator<TReturn = void> = Generator<Promise<void>, TReturn, void>;

export function toFlowGeneratorFunction<TArgs extends unknown[], TReturn = void>(
  fn: (...args: TArgs) => Promise<TReturn> | TReturn,
): (...args: TArgs) => FlowGenerator<TReturn> {
  return function* flowGeneratorFunction(...args: TArgs): FlowGenerator<TReturn> {
    let value = undefined as TReturn;
    yield Promise.resolve(fn(...args)).then((result) => {
      value = result;
    });
    return value;
  };
}
