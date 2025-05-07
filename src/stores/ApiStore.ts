import { action, computed, flow, makeObservable, observable } from 'mobx';
import { toFlowGeneratorFunction } from 'to-flow-generator-function';

import { type Configuration } from '../openapi-generator';
import { callApi } from '../utils/api';

import { type ApiType } from '../types/ApiType';
import { LoadingStore } from './LoadingStore';

export class ApiStore<
  T extends ApiType,
  Config extends Configuration = T extends ApiType<infer C> ? C : never,
> extends LoadingStore {
  api: T | null = null;
  name: string = '';
  constructor(name: string) {
    super();
    makeObservable(this, {
      initApi: action.bound,
      setApi: action,
      apiIsSet: computed,
      api: observable,
      name: false,
      _apiCall: flow,
    });
    this.name = name;
    this.setIsLoading(true);
  }

  setApi = (api: T) => {
    this.api = api;
  };

  initApi(config: Config) {
    throw new Error('initApi is not implemented by ' + this.name);
  }

  get apiIsSet() {
    return this.api !== null;
  }

  /*
  TypeScript is has problems with the generic type and will error if the class is used in multiple places.
  Solution: Implement the ._apiCall in as .apiCall method in the subclasses like this:
  apiCall = flow(
    toFlowGeneratorFunction(
      async <
        Endpoint extends keyof Api,
        Args extends Parameters<Api[Endpoint]>[0],
      >(
        apiCall: Endpoint,
        args: Args extends undefined ? never : Args,
      ) => {
        return await this._apiCall<Api, Endpoint>(apiCall, args);
      },
    ),
  );
  */

  _apiCall = flow(
    toFlowGeneratorFunction(
      async <
        Api extends ApiType = T,
        Endpoint extends keyof Api = keyof Api,
        // @ts-expect-error marks as error but works
        Args extends Parameters<Api[Endpoint]>[0] = Parameters<
          // @ts-expect-error marks as error but works
          Api[Endpoint]
        >[0],
      >(
        apiCall: Endpoint,
        args: Args extends undefined ? never : Args,
      ) => {
        try {
          if (!this.api) throw new Error(`${this.name} Api is not set`);
          this.setIsLoading(true);
          // @ts-expect-error marks as error but works
          return await callApi<Api, Endpoint, Args>(apiCall, args, this.api);
        } finally {
          this.setIsLoading(false);
        }
      },
    ),
  );
}
