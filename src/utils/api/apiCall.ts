import { type ApiType } from '../../types';
import { handleError } from './handleError';

import type { ApiMethodArgs, ApiMethodName } from './types/ApiMethod.type';

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
    if (!api) throw new Error('No Api provided');
    const endpoint = api[apiCall] as (this: Api, request: Args) => unknown;
    return (await endpoint.call(api, args)) as Awaited<
      ReturnType<Extract<Api[Endpoint & keyof Api], (...parameters: never) => unknown>>
    >;
  } catch (err) {
    await handleError(err);
  }
};
