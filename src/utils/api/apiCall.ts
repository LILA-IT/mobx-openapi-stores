import { type ApiType } from '../../types';
import { handleError } from './handleError';

import type { ApiMethodArgs, ApiMethodName } from './types/ApiMethod.type';

type EndpointResult<Api extends ApiType, Endpoint extends ApiMethodName<Api>> = Awaited<
  ReturnType<Extract<Api[Endpoint & keyof Api], (...parameters: never) => unknown>>
>;

/** Request init overrides forwarded to a generated endpoint as its second argument. */
export type EndpointInit = {
  signal?: AbortSignal;
};

/**
 * Invokes a generated client method with the client as `this`, without error handling.
 * `init` is passed as the second argument (the generated `initOverrides`) only when given.
 * @internal
 */
export const invokeEndpoint = async <
  Api extends ApiType,
  Endpoint extends ApiMethodName<Api>,
>(
  apiCall: Endpoint,
  args: ApiMethodArgs<Api, Endpoint>,
  api: Api | undefined,
  init?: EndpointInit,
): Promise<EndpointResult<Api, Endpoint>> => {
  if (!api) throw new Error('No Api provided');
  const endpoint = api[apiCall] as (
    this: Api,
    request: ApiMethodArgs<Api, Endpoint>,
    init?: EndpointInit,
  ) => unknown;
  const pending =
    init === undefined ? endpoint.call(api, args) : endpoint.call(api, args, init);
  return (await pending) as EndpointResult<Api, Endpoint>;
};

/**
 * Invokes a generated client method with the client as `this`.
 * Errors are normalized and rethrown through {@link handleError}.
 */
export const callApi = async <
  Api extends ApiType,
  Endpoint extends ApiMethodName<Api>,
  Args extends ApiMethodArgs<Api, Endpoint> = ApiMethodArgs<Api, Endpoint>,
>(
  apiCall: Endpoint,
  args: Args extends undefined ? never : Args,
  api?: Api,
) => {
  try {
    return await invokeEndpoint<Api, Endpoint>(apiCall, args, api);
  } catch (err) {
    await handleError(err);
  }
};
