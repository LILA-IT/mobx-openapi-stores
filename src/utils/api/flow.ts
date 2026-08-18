// Adapted from to-flow-generator-function (MIT, © 2023 harunou).
/** Generator shape accepted by MobX `flow`. */
export type FlowGenerator<TReturn = void> = Generator<Promise<void>, TReturn, void>;

/** Converts a promise-returning function into a MobX `flow` generator. */
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
