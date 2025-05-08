import { action, computed, flow, makeObservable, observable } from 'mobx';
import { toFlowGeneratorFunction } from 'to-flow-generator-function';

import { type ArrayElement } from '../types';

import { type ApiType } from '../types/ApiType';
import { SingleStore, type SingleType } from './SingleStore';
import assign from 'lodash/assign';
import map from 'lodash/map';
import remove from 'lodash/remove';
import find from 'lodash/find';
import { CollectionStore } from './CollectionStore';

export type CollectionType<TSingle extends SingleType = SingleType> =
  (Partial<TSingle> & { id: number | string })[];

type FetchOptions = {
  useCache?: boolean;
};

export class CrudCollectionStore<
  TApi extends ApiType,
  TSingle extends SingleType,
  TCollection extends CollectionType<TSingle> = TSingle[],
> extends CollectionStore<TApi, TSingle, TCollection> {
  _collection: TCollection = [] as unknown as TCollection;

  constructor(name: string) {
    super(name);
    makeObservable(this, {
      _fetch: flow,
      _fetchAll: flow,
      _create: flow,
      _update: flow,
      _delete: flow,
    });
  }

  _fetch = flow(
    toFlowGeneratorFunction(
      async <
        Endpoint extends keyof TApi = keyof TApi,
        // @ts-expect-error marks as error but works
        Args extends Parameters<TApi[Endpoint]>[0] = Parameters<
          // @ts-expect-error marks as error but works
          TApi[Endpoint]
        >[0],
      >(
        endpoint: Endpoint,
        args: Args extends undefined
          ? never
          : Args & {
              id: ArrayElement<TCollection>['id'];
            },
        { useCache = false }: FetchOptions = {},
      ) => {
        let item: TSingle | ArrayElement<TCollection> | undefined;
        if (useCache)
          item = await new Promise((resolve) => resolve(this.getById(args.id)));
        if (!useCache || !item) {
          item = (await this.apiCall<TApi>(
            endpoint,
            args,
          )) as unknown as TSingle;
          if (!item) return;
          this.setItem(item);
        }
        return item;
      },
    ),
  );

  _fetchAll = flow(
    toFlowGeneratorFunction(
      async <
        Endpoint extends keyof TApi,
        // @ts-expect-error marks as error but works
        Args extends Parameters<TApi[Endpoint]>[0] = Parameters<
          // @ts-expect-error marks as error but works
          TApi[Endpoint]
        >[0],
      >(
        endpoint: Endpoint,
        args: Args extends undefined ? never : Args,
        { useCache = false }: FetchOptions = {},
      ) => {
        let items: TCollection | undefined;
        if (useCache) {
          items = await new Promise((resolve) => resolve(this.collection));
        }
        if (!useCache || !items) {
          items = (await this.apiCall<TApi>(
            endpoint,
            args,
          )) as unknown as TCollection;
          this.setCollection(items);
        }
        return items;
      },
    ),
  );

  _create = flow(
    toFlowGeneratorFunction(
      async <
        Endpoint extends keyof TApi,
        // @ts-expect-error marks as error but works
        Args extends Parameters<TApi[Endpoint]>[0] = Parameters<
          // @ts-expect-error marks as error but works
          TApi[Endpoint]
        >[0],
      >(
        endpoint: Endpoint,
        args: Args extends undefined ? never : Args,
      ) => {
        const item = await this.apiCall<TApi>(endpoint, args);
        if (item) this.addItem(item as TSingle);
        else throw new Error('Create Endpoint did not return an item');
        return item;
      },
    ),
  );

  _update = flow(
    toFlowGeneratorFunction(
      async <
        Endpoint extends keyof TApi,
        // @ts-expect-error marks as error but works
        Args extends Parameters<TApi[Endpoint]>[0] = Parameters<
          // @ts-expect-error marks as error but works
          TApi[Endpoint]
        >[0],
      >(
        endpoint: Endpoint,
        args: Args extends undefined ? never : Args,
      ) => {
        const item = await this.apiCall<TApi>(endpoint, args);
        if (item) this.editItem(item as TSingle);
        else throw new Error('Update Endpoint did not return an item');
        return item;
      },
    ),
  );

  _delete = flow(
    toFlowGeneratorFunction(
      async <
        Endpoint extends keyof TApi,
        // @ts-expect-error marks as error but works
        Args extends Parameters<TApi[Endpoint]>[0] = Parameters<
          // @ts-expect-error marks as error but works
          TApi[Endpoint]
        >[0],
      >(
        endpoint: Endpoint,
        args: Args extends undefined
          ? never
          : Args & {
              id: ArrayElement<TCollection>['id'];
            },
      ) => {
        await this.apiCall<TApi>(endpoint, args);
        this.removeItem(args.id);
      },
    ),
  );
}
