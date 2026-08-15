import { type ApiType } from '../../types';
import { handleError } from './handleError';

import type { ApiMethodArgs, ApiMethodName } from './types/ApiMethod.type';

/**
 * Invokes an OpenAPI-generated client method while preserving `this` binding.
 *
 * Generated clients often rely on instance state (configuration, middleware).
 * Calling `api[endpoint](args)` can lose `this`; `.call(api, args)` keeps it.
 *
 * @template Api - API client type (must extend {@link ApiType}).
 * @template Endpoint - Method name on `Api`.
 * @template Args - First argument type for `Endpoint`.
 * @param apiCall - Endpoint method name.
 * @param args - Request payload / parameters for the endpoint.
 * @param api - API client instance.
 * @returns The awaited endpoint result, or rethrows via {@link handleError}.
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
    if (!api) throw new Error('No Api provided');
    const endpoint = api[apiCall] as (this: Api, request: Args) => unknown;
    return (await endpoint.call(api, args)) as Awaited<
      ReturnType<Extract<Api[Endpoint & keyof Api], (...parameters: never) => unknown>>
    >;
  } catch (err) {
    await handleError(err);
  }
};
