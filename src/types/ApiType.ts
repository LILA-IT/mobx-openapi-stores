import { type BaseAPI, type Configuration } from 'src/openapi-generator';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ApiType<T extends Configuration = Configuration> = BaseAPI & {
  initApi: (config: typeof Configuration) => void;
};

export type ApiCall<
  TApi extends ApiType,
  TEndpoint extends keyof TApi,
> = TApi[TEndpoint] extends (...args: infer Args) => infer Return
  ? (...args: Args) => Return
  : never;

export type ApiResult<TApi extends ApiType, TEndpoint extends keyof TApi> = Awaited<
  ReturnType<ApiCall<TApi, TEndpoint>>
>;
