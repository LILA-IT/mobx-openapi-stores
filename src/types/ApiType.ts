import { BaseAPI, Configuration } from 'src/openapi-generator';

export type ApiType<Config extends Configuration = Configuration> = BaseAPI & {
  initApi: (config: Config) => void;
};
