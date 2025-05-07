import { action, computed, flow, makeObservable, observable } from 'mobx';
import { toFlowGeneratorFunction } from 'to-flow-generator-function';

import { type ArrayElement } from '../types';

import { type ApiType } from '../types/ApiType';
import { SingleStore, type SingleType } from './SingleStore';
import assign from 'lodash/assign';
import map from 'lodash/map';
import remove from 'lodash/remove';
import find from 'lodash/find';

export type CollectionType<TSingle extends SingleType = SingleType> =
  (Partial<TSingle> & { id: number | string })[];

type FetchOptions = {
  useCache?: boolean;
};

export class CollectionStore<
  TApi extends ApiType,
  TSingle extends SingleType,
  TCollection extends CollectionType<TSingle> = TSingle[],
> extends SingleStore<TApi, TSingle> {
  _collection: TCollection = [] as unknown as TCollection;

  constructor(name: string) {
    super(name);
    makeObservable(this, {
      _collection: observable,
      collection: computed,
      setCollection: action,
      editCollection: action,
      addItem: action,
      editItem: action,
      removeItem: action,
      getById: false,
      _fetch: flow,
      _fetchAll: flow,
      setItem: action,
    });
  }

  get collection() {
    return this._collection;
  }

  setCollection = (newCollection: TCollection) => {
    this._collection = newCollection;
  };

  editCollection = (updatedCollection: TCollection) => {
    this.setCollection(updatedCollection);
  };

  addItem = (newItem: TSingle, setCurrent: boolean = true) => {
    if (setCurrent) this.setCurrent(newItem);
    this._collection.push(newItem);
  };

  setItem = (item: TSingle, setCurrent: boolean = true) => {
    if (setCurrent || this.current?.id === item.id) this.setCurrent(item);
    this.setCollection(
      // @ts-expect-error lodash types are not correct
      _.map(this._collection, (collectionItem) =>
        collectionItem.id === item.id ? item : collectionItem,
      ),
    );
  };

  editItem = (updatedItem: TSingle, setCurrent: boolean = true) => {
    if (setCurrent) assign(this._current, updatedItem);
    else if (this.current?.id === updatedItem.id) {
      assign(this._current, updatedItem);
    }
    this.setCollection(
      // @ts-expect-error lodash types are not correct
      map(this._collection, (item) =>
        item.id === updatedItem.id ? assign(item, updatedItem) : item,
      ),
    );
  };

  removeItem = (id: ArrayElement<TCollection>['id']) => {
    if (this.current?.id === id) this.setCurrent(null);
    remove(this._collection, (item) => item.id === id);
  };

  getById = (
    id: ArrayElement<TCollection>['id'],
  ): ArrayElement<TCollection> | TSingle | undefined => {
    if (this.current?.id === id) return this.current;
    return find(
      this.collection,
      (item) => item.id === id,
    ) as ArrayElement<TCollection>;
  };

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
