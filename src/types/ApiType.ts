import { BaseAPI, Configuration } from 'src/openapi-generator';

export type ApiType<T extends Configuration = Configuration> = BaseAPI & {
  initApi: (config: typeof Configuration) => void;
};
