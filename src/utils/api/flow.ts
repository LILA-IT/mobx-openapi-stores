import { toFlowGeneratorFunction } from 'to-flow-generator-function';

export type FlowGenerator<TReturn = void> = ReturnType<
  typeof toFlowGeneratorFunction<unknown[], TReturn>
>;

// export function toFlowGeneratorFunction<TArgs extends unknown[], TReturn = void>(
//     fn: (...args: TArgs) => Promise<TReturn> | TReturn
// ): (...args: TArgs) => FlowGenerator<TReturn> {
//     return function* flowGeneratorFunction(...args: TArgs): FlowGenerator<TReturn> {
//         let value: TReturn = undefined as TReturn;
//         yield Promise.resolve(fn(...args)).then(result => {
//             value = result;
//         });

//         return value;
//     };
// }

export { toFlowGeneratorFunction };
