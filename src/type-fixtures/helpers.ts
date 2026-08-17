/**
 * Compile-time helpers for type fixtures. Not runtime tests.
 * If an assertion fails, `yarn type-check` fails.
 */
export type ExpectTrue<T extends true> = T;

export type IsAssignable<From, To> = From extends To ? true : false;
