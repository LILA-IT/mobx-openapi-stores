import { type BaseAPI, type Configuration } from '../openapi-generator';

/** Structural constraint expected of generated API clients. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ApiType<T extends Configuration = Configuration> = BaseAPI & {
  initApi: (config: typeof Configuration) => void;
};

/** Callable signature for an endpoint selected from an API type. */
export type ApiCall<
  TApi extends ApiType,
  TEndpoint extends keyof TApi,
> = TApi[TEndpoint] extends (...args: infer Args) => infer Return
  ? (...args: Args) => Return
  : never;

/** Awaited result type for a selected API endpoint. */
export type ApiResult<TApi extends ApiType, TEndpoint extends keyof TApi> = Awaited<
  ReturnType<ApiCall<TApi, TEndpoint>>
>;

/** Configuration inferred from a generated API type. */
export type ApiConfig<TApi extends ApiType> =
  TApi extends ApiType<infer C> ? C : Configuration;
