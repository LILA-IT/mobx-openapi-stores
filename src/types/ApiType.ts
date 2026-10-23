import type { ApiMethodName } from '../utils/api/types/ApiMethod.type';

/** Structural configuration accepted by generated API client factories. */
export type ApiConfiguration = object;

/** Structural constraint expected of generated API clients. */
export type ApiType = object;

/** Callable signature for an endpoint selected from an API type. */
export type ApiCall<
  TApi extends ApiType,
  TEndpoint extends ApiMethodName<TApi>,
> = TApi[TEndpoint] extends (...args: infer Args) => infer Return
  ? (...args: Args) => Return
  : never;

/** Awaited result type for a selected API endpoint. */
export type ApiResult<
  TApi extends ApiType,
  TEndpoint extends ApiMethodName<TApi>,
> = Awaited<ReturnType<ApiCall<TApi, TEndpoint>>>;

/** Configuration passed to the generated API client factory. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ApiConfig<TApi extends ApiType> = ApiConfiguration;
