export type ConfigurationParameters = {
  basePath?: string;
  fetchApi?: typeof fetch;
  middleware?: readonly unknown[];
  queryParamsStringify?: (params: Record<string, unknown>) => string;
  username?: string;
  password?: string;
  apiKey?: string | Promise<string> | ((name: string) => string | Promise<string>);
  accessToken?:
    | string
    | Promise<string>
    | ((name?: string, scopes?: string[]) => string | Promise<string>);
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
};

/** Minimal configuration value compatible with generated client factories. */
export class Configuration {
  readonly basePath: string;

  constructor(readonly parameters: ConfigurationParameters = {}) {
    this.basePath = parameters.basePath ?? '';
  }
}

/** Structural base accepted from generated API clients. */
export type BaseAPI = object;

/** Error returned by generated fetch clients for non-successful responses. */
export class ResponseError extends Error {
  override name = 'ResponseError';

  constructor(
    readonly response: Response,
    message = 'Response returned an error code',
  ) {
    super(message);
  }
}
