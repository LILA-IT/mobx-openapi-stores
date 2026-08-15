/**
 * Helpers for OpenAPI-generated API classes.
 *
 * `keyof` on a union of classes is an intersection (only shared BaseAPI keys).
 * Distributing over the union exposes each concrete endpoint name.
 *
 * @example
 * type Endpoints = ApiMethodName<UserApi | PetApi>; // methods from either API
 * type Args = ApiMethodArgs<UserApi, 'getUserById'>;
 */

/** Distributive union of callable method names on `TApi`. */
export type ApiMethodName<TApi> = TApi extends unknown
  ? {
      [K in keyof TApi]-?: TApi[K] extends (...args: never[]) => unknown ? K : never;
    }[keyof TApi]
  : never;

/** The method type for `Endpoint` on `TApi`, distributed over unions. */
export type ApiMethod<TApi, Endpoint extends PropertyKey> = TApi extends unknown
  ? Endpoint extends keyof TApi
    ? TApi[Endpoint] extends (...args: never[]) => unknown
      ? TApi[Endpoint]
      : never
    : never
  : never;

/** First parameter type of {@link ApiMethod}. */
export type ApiMethodArgs<TApi, Endpoint extends PropertyKey> = Parameters<
  ApiMethod<TApi, Endpoint>
>[0];

/** Return type of {@link ApiMethod}. */
export type ApiMethodResult<TApi, Endpoint extends PropertyKey> = ReturnType<
  ApiMethod<TApi, Endpoint>
>;
