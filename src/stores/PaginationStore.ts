import { action, computed, flow, makeObservable, observable } from 'mobx';

import { type ArrayElement, type SingleType } from '../types';
import { type ApiType } from '../types/ApiType';
import type { ApiMethodArgs, ApiMethodName } from '../utils/api/types/ApiMethod.type';
import { SingleStore } from './SingleStore';

type PaginationStateInternal = {
  currentPage: number;
  total: number;
  totalPages: number;
  pageSize: number;
  sort: string;
};

/** Public pagination state, including the current `page` alias. */
export type PaginationState = PaginationStateInternal & {
  page: number;
};

/** Metadata returned for one page. */
export type PaginationInner = {
  currentPage: number;
  total: number;
  totalPages: number;
  pageSize: number;
  sort: string;
};

/** One page payload and its pagination metadata. */
export type PaginatedPage<T> = {
  data: T[];
  pagination: PaginationInner;
};

/** Aggregate metadata for a multi-page response. */
export type PaginationOuter = {
  total: number;
  totalPages: number;
  pageSize: number;
  sort: string;
};

/** Fetched pages and their aggregate pagination metadata. */
export type MultiPageResponse<T> = {
  pages: PaginatedPage<T>[];
  pagination: PaginationOuter;
};

/** Persistent page size, sorting, and query parameters. */
export type FetchPageParams = {
  pageSize: number;
  sort: string;
  [key: string]: unknown;
};

/** Cache and loading controls for `fetchPage`. */
export type FetchPageOptions = {
  useCache?: boolean;
  disableLoading?: boolean;
};

/** Loading controls passed to a paginated API adapter. */
export type FetchPagesApiOptions = {
  disableLoading?: boolean;
};

/**
 * Manages a page cache, current-page projection, and adjacent prefetching.
 * Subclasses supply the paginated request through `_fetchPagesApi`.
 */
export abstract class PaginationStore<
  TApi extends ApiType,
  TSingle extends SingleType,
  TPageCollection extends Partial<TSingle> & { id: TSingle['id'] } = TSingle,
> extends SingleStore<TApi, TSingle> {
  /**
   * @protected
   * @property _pagesCache
   * @description Observable page data keyed by one-based page number.
   * @observable
   */
  _pagesCache = observable.map<number, TPageCollection[]>();

  /**
   * @protected
   * @property _paginationState
   * @description Internal observable pagination metadata.
   * @observable
   */
  _paginationState: PaginationStateInternal;

  /**
   * @protected
   * @property _queryParams
   * @description Parameters associated with the currently cached pages.
   * @observable
   */
  _queryParams: Record<string, unknown> = {};

  /**
   * @protected
   * @property _prefetchCount
   * @description Number of adjacent pages considered for background prefetching.
   * @observable
   */
  _prefetchCount: number;

  /**
   * @constructor
   * @description Creates a paginated store with an empty cache and initial
   * pagination settings.
   * @param {string} name - Store name passed to `SingleStore`.
   * @param {{ pageSize?: number; sort?: string; prefetchCount?: number }} [options]
   * Pagination and prefetch defaults.
   */
  constructor(
    name: string,
    {
      pageSize = 20,
      sort = 'updatedAt:desc',
      prefetchCount = 1,
    }: { pageSize?: number; sort?: string; prefetchCount?: number } = {},
  ) {
    super(name);
    makeObservable(this, {
      _pagesCache: observable,
      pagesCache: computed,
      _paginationState: observable,
      _queryParams: observable,
      _setQueryParams: action,
      _prefetchCount: observable,
      collection: computed,
      paginationState: computed,
      _setPaginationState: action,
      getById: false,
      addItem: action,
      editItem: action,
      removeItem: action,
      setItem: action,
      fetchPage: flow,
      _fetchPagesApi: false,
      _getQueryParams: false,
      _onCreate: action,
      _onUpdate: action,
      _onDelete: action,
      _invalidateCache: action,
      resetListViewToFirstPage: action,
      _updateItemInCache: action,
      _removeItemFromCache: action,
      _setPagesFromResponse: action,
      _buildCacheKey: false,
      _paramsMatchCache: false,
      _findItemInPages: false,
      _getPagesToFetch: false,
      _prefetchAdjacentPages: flow,
      _fetch: flow,
      __apiCall: flow,
    });
    this._paginationState = observable({
      currentPage: 1,
      total: 0,
      totalPages: 0,
      pageSize,
      sort,
    });
    this._prefetchCount = prefetchCount;
  }

  /**
   * @property collection
   * @description Returns the cached items for the current page.
   * @returns {TPageCollection[]} The active page, or an empty array when uncached.
   * @computed
   */
  get collection(): TPageCollection[] {
    return this._pagesCache.get(this._paginationState.currentPage) ?? [];
  }

  /**
   * @property paginationState
   * @description Exposes pagination metadata with `page` aliased from
   * `currentPage` for consumers.
   * @returns {PaginationState} A snapshot of the current pagination state.
   * @computed
   */
  get paginationState(): PaginationState {
    return {
      ...this._paginationState,
      page: this._paginationState.currentPage,
    };
  }

  /**
   * @property pagesCache
   * @description Provides read access to all cached pages.
   * @returns {Map<number, TPageCollection[]>} Cached pages keyed by page number.
   * @computed
   */
  get pagesCache(): Map<number, TPageCollection[]> {
    return this._pagesCache;
  }

  /**
   * @protected
   * @method _setPaginationState
   * @description Replaces every field of the internal pagination state.
   * @param {PaginationStateInternal} state - The next pagination state.
   * @returns {void}
   * @action
   */
  _setPaginationState = (state: PaginationStateInternal): void => {
    this._paginationState.currentPage = state.currentPage;
    this._paginationState.total = state.total;
    this._paginationState.totalPages = state.totalPages;
    this._paginationState.pageSize = state.pageSize;
    this._paginationState.sort = state.sort;
  };

  /**
   * @protected
   * @method _setQueryParams
   * @description Stores the parameters represented by the current cache.
   * @param {Record<string, unknown>} params - The effective query parameters.
   * @returns {void}
   * @action
   */
  _setQueryParams = (params: Record<string, unknown>): void => {
    this._queryParams = params;
  };

  /**
   * @method getById
   * @description Finds an entity by ID, checking `current`, the active page,
   * and then all cached pages.
   * @param {ArrayElement<TSingle[]>['id']} id - The entity ID.
   * @returns {TSingle | TPageCollection | undefined} The matching entity.
   */
  getById = (
    id: ArrayElement<TSingle[]>['id'],
  ): TSingle | TPageCollection | undefined => {
    if (this.current?.id === id) return this.current;
    const itemInCollection = this.collection.find((item) => item.id === id);
    if (itemInCollection) return itemInCollection;

    for (const pageData of this._pagesCache.values()) {
      const item = pageData.find((pageItem) => pageItem.id === id);
      if (item) return item;
    }

    return undefined;
  };

  /**
   * @method addItem
   * @description Optionally selects a newly created entity and delegates cache
   * handling to `_onCreate`.
   * @param {TSingle} newItem - The newly created entity.
   * @param {boolean} [setCurrent=true] - Whether to select the entity.
   * @returns {void}
   * @action
   */
  addItem = (newItem: TSingle, setCurrent = true): void => {
    if (setCurrent) this.setCurrent(newItem);
    this._onCreate(newItem);
  };

  /**
   * @method editItem
   * @description Updates the current item when applicable and delegates cached
   * page handling to `_onUpdate`.
   * @param {TSingle} updatedItem - The updated entity.
   * @param {boolean} [setCurrent=true] - Whether to select the update.
   * @returns {void}
   * @action
   */
  editItem = (updatedItem: TSingle, setCurrent = true): void => {
    if (setCurrent || this.current?.id === updatedItem.id) {
      this.setCurrent(
        this.current?.id === updatedItem.id
          ? Object.assign({}, this.current, updatedItem)
          : updatedItem,
      );
    }
    this._onUpdate(updatedItem);
  };

  /**
   * @method removeItem
   * @description Clears a matching current item and delegates cache handling
   * to `_onDelete`.
   * @param {ArrayElement<TSingle[]>['id']} id - The deleted entity ID.
   * @returns {void}
   * @action
   */
  removeItem = (id: ArrayElement<TSingle[]>['id']): void => {
    if (this.current?.id === id) this.setCurrent(null);
    this._onDelete(id);
  };

  /**
   * @method setItem
   * @description Optionally selects an entity and updates its cached occurrence.
   * @param {TSingle} item - The complete entity to store.
   * @param {boolean} [setCurrent=true] - Whether to select the entity.
   * @returns {void}
   * @action
   */
  setItem = (item: TSingle, setCurrent = true): void => {
    if (setCurrent || this.current?.id === item.id) this.setCurrent(item);
    this._updateItemInCache(item);
  };

  /**
   * @method fetchPage
   * @description Loads a page using effective query parameters. A compatible
   * cached page may be returned immediately; otherwise the API is called, the
   * cache and pagination state are updated, and adjacent prefetching begins.
   * @param {number} [page=1] - One-based page number.
   * @param {Partial<FetchPageParams>} [params] - Query overrides.
   * @param {FetchPageOptions} [options] - Cache and loading behavior.
   * @returns {Promise<PaginatedPage<TPageCollection> | undefined>} The requested
   * page, or `undefined` when the API returns no response.
   * @action
   */
  fetchPage = flow(function* (
    this: PaginationStore<TApi, TSingle, TPageCollection>,
    page: number = 1,
    params?: Partial<FetchPageParams>,
    { useCache = false, disableLoading = false }: FetchPageOptions = {},
  ) {
    const pageSize = params?.pageSize ?? this._paginationState.pageSize;
    const sort = params?.sort ?? this._paginationState.sort;
    const fetchParams = {
      ...this._getQueryParams(),
      ...params,
      pageSize,
      sort,
    };
    const cachedPage = this._pagesCache.get(page);
    const isCacheHit = useCache && cachedPage && this._paramsMatchCache(fetchParams);

    if (isCacheHit) {
      this._paginationState.currentPage = page;
      void this._prefetchAdjacentPages(page, fetchParams);
      return {
        data: cachedPage,
        pagination: { ...this._paginationState, currentPage: page },
      };
    }

    if (!this._paramsMatchCache(fetchParams)) this._invalidateCache();

    const response = (yield this._fetchPagesApi([page], fetchParams, {
      disableLoading,
    })) as unknown as MultiPageResponse<TPageCollection> | undefined;
    void this._prefetchAdjacentPages(page, fetchParams);
    if (!response) return undefined;

    this._setPagesFromResponse(response);
    this._setQueryParams(fetchParams);
    this._setPaginationState({
      currentPage: page,
      pageSize,
      sort,
      total: response.pagination.total,
      totalPages: response.pagination.totalPages,
    });

    return {
      data: this._pagesCache.get(page) ?? [],
      pagination: { ...this._paginationState, currentPage: page },
    };
  });

  /**
   * @protected
   * @method _prefetchAdjacentPages
   * @description Fetches uncached neighboring pages within `_prefetchCount`.
   * @param {number} page - The page around which to prefetch.
   * @param {FetchPageParams} fetchParams - Effective request parameters.
   * @returns {Promise<void>}
   * @action
   */
  _prefetchAdjacentPages = flow(function* (
    this: PaginationStore<TApi, TSingle, TPageCollection>,
    page: number,
    fetchParams: FetchPageParams,
  ) {
    const pagesToPrefetch = this._getPagesToFetch(page).filter(
      (pageToFetch) => pageToFetch !== page && !this._pagesCache.has(pageToFetch),
    );
    if (pagesToPrefetch.length === 0) return;

    const response = (yield this._fetchPagesApi(pagesToPrefetch, fetchParams, {
      disableLoading: true,
    })) as unknown as MultiPageResponse<TPageCollection> | undefined;
    if (response) this._setPagesFromResponse(response);
  });

  /**
   * @protected
   * @method _fetchPagesApi
   * @description API extension point for loading one or more pages. Subclasses
   * must override this implementation.
   * @param {number[]} _pages - One-based page numbers to fetch.
   * @param {FetchPageParams} _params - Effective query parameters.
   * @param {FetchPagesApiOptions} [_options] - Loading behavior.
   * @returns {Promise<MultiPageResponse<TPageCollection> | undefined>} Page data.
   */
  _fetchPagesApi = flow(function* (
    _pages: number[],
    _params: FetchPageParams,
    _options?: FetchPagesApiOptions,
  ): Generator<
    Promise<MultiPageResponse<TPageCollection> | undefined>,
    MultiPageResponse<TPageCollection> | undefined,
    MultiPageResponse<TPageCollection> | undefined
  > {
    return yield Promise.reject(new Error('Not implemented'));
  });

  /**
   * @protected
   * @method _getQueryParams
   * @description Extension point for persistent query parameters.
   * @returns {Record<string, unknown>} Query parameters included in each fetch.
   */
  _getQueryParams(): Record<string, unknown> {
    return {};
  }

  /**
   * @protected
   * @method _onCreate
   * @description Handles creation side effects. The default invalidates all pages.
   * @param {TSingle} _item - The created entity.
   * @returns {void}
   * @action
   */
  _onCreate(_item: TSingle): void {
    this._invalidateCache();
  }

  /**
   * @protected
   * @method _onUpdate
   * @description Handles update side effects. The default updates a cached match.
   * @param {TSingle} item - The updated entity.
   * @returns {void}
   * @action
   */
  _onUpdate(item: TSingle): void {
    this._updateItemInCache(item);
  }

  /**
   * @protected
   * @method _onDelete
   * @description Handles deletion side effects. The default removes a cached match.
   * @param {ArrayElement<TSingle[]>['id']} id - The deleted entity ID.
   * @returns {void}
   * @action
   */
  _onDelete(id: ArrayElement<TSingle[]>['id']): void {
    this._removeItemFromCache(id);
  }

  /**
   * @protected
   * @method _invalidateCache
   * @description Clears all cached pages.
   * @returns {void}
   * @action
   */
  _invalidateCache(): void {
    this._pagesCache.clear();
  }

  /**
   * @method resetListViewToFirstPage
   * @description Clears cached pages and resets the current page to one while
   * preserving the remaining pagination settings.
   * @returns {void}
   * @action
   */
  resetListViewToFirstPage = (): void => {
    this._invalidateCache();
    this._setPaginationState({
      ...this._paginationState,
      currentPage: 1,
    });
  };

  /**
   * @protected
   * @method _updateItemInCache
   * @description Merges an entity into its first matching cached occurrence.
   * @param {TSingle} item - The entity to merge.
   * @returns {void}
   * @action
   */
  _updateItemInCache(item: TSingle): void {
    const [pageNumber, itemIndex] = this._findItemInPages(item.id) ?? [];
    if (pageNumber === undefined || itemIndex === undefined) return;

    const pageData = this._pagesCache.get(pageNumber);
    if (pageData) pageData[itemIndex] = Object.assign(pageData[itemIndex], item);
  }

  /**
   * @protected
   * @method _removeItemFromCache
   * @description Removes the first matching cached entity and decrements the
   * total count without allowing it to become negative.
   * @param {ArrayElement<TSingle[]>['id']} id - The entity ID to remove.
   * @returns {void}
   * @action
   */
  _removeItemFromCache(id: ArrayElement<TSingle[]>['id']): void {
    const [pageNumber, itemIndex] = this._findItemInPages(id) ?? [];
    if (pageNumber === undefined || itemIndex === undefined) return;

    const pageData = this._pagesCache.get(pageNumber);
    if (!pageData) return;

    pageData.splice(itemIndex, 1);
    this._paginationState.total = Math.max(0, this._paginationState.total - 1);
  }

  /**
   * @protected
   * @method _setPagesFromResponse
   * @description Stores all returned pages and updates aggregate pagination totals.
   * @param {MultiPageResponse<TPageCollection>} response - The multi-page response.
   * @returns {void}
   * @action
   */
  _setPagesFromResponse(response: MultiPageResponse<TPageCollection>): void {
    for (const page of response.pages) {
      this._pagesCache.set(page.pagination.currentPage, page.data);
    }
    this._paginationState.total = response.pagination.total;
    this._paginationState.totalPages = response.pagination.totalPages;
  }

  /**
   * @protected
   * @method _buildCacheKey
   * @description Serializes query parameters for cache compatibility checks.
   * @param {Record<string, unknown>} params - Parameters to serialize.
   * @returns {string} The serialized cache key.
   */
  _buildCacheKey(params: Record<string, unknown>): string {
    return JSON.stringify(params);
  }

  /**
   * @protected
   * @method _paramsMatchCache
   * @description Checks whether parameters describe the currently cached query.
   * @param {Record<string, unknown>} params - Parameters to compare.
   * @returns {boolean} Whether the parameters match the cache.
   */
  _paramsMatchCache(params: Record<string, unknown>): boolean {
    return this._buildCacheKey(params) === this._buildCacheKey(this._queryParams);
  }

  /**
   * @protected
   * @method _findItemInPages
   * @description Locates the first cached occurrence of an entity.
   * @param {ArrayElement<TSingle[]>['id']} itemId - The entity ID.
   * @returns {[number, number] | undefined} Page number and item index, if found.
   */
  _findItemInPages(itemId: ArrayElement<TSingle[]>['id']): [number, number] | undefined {
    for (const [pageNumber, pageData] of this._pagesCache) {
      const itemIndex = pageData.findIndex((item) => item.id === itemId);
      if (itemIndex !== -1) return [pageNumber, itemIndex];
    }
    return undefined;
  }

  /**
   * @protected
   * @method _getPagesToFetch
   * @description Builds the bounded range of pages around a requested page.
   * @param {number} page - The center page.
   * @returns {number[]} Valid page numbers eligible for fetching.
   */
  _getPagesToFetch(page: number): number[] {
    const pages: number[] = [];
    const totalPages = this._paginationState.totalPages || Number.MAX_SAFE_INTEGER;

    for (
      let pageNumber = page - this._prefetchCount;
      pageNumber <= page + this._prefetchCount;
      pageNumber++
    ) {
      if (pageNumber >= 1 && pageNumber <= totalPages) pages.push(pageNumber);
    }

    return pages.length > 0 ? pages : [1];
  }

  /**
   * @protected
   * @method _fetch
   * @description Fetches a single entity through an API endpoint, optionally
   * returning a cached value first, then stores a successful response.
   * @template Endpoint - A valid API method name.
   * @param {Endpoint} endpoint - API endpoint to invoke.
   * @param {ApiMethodArgs<TApi, Endpoint> & { id: TSingle['id'] }} args -
   * Endpoint arguments including the entity ID.
   * @param {FetchPageOptions} [options] - Cache and loading behavior.
   * @returns {Promise<TSingle | TPageCollection | undefined>} The cached or
   * fetched entity.
   * @action
   */
  _fetch = flow(function* <Endpoint extends ApiMethodName<TApi>>(
    this: PaginationStore<TApi, TSingle, TPageCollection>,
    endpoint: Endpoint,
    args: ApiMethodArgs<TApi, Endpoint> & { id: TSingle['id'] },
    { useCache = false, disableLoading }: FetchPageOptions = {},
  ) {
    let item: TSingle | TPageCollection | undefined;
    if (useCache) {
      const cachedItem: unknown = yield Promise.resolve(this.getById(args.id));
      item = cachedItem as TSingle | TPageCollection | undefined;
    }
    if (useCache && item) return item;

    const result = (yield this.apiCall(endpoint as never, args as never, {
      disableLoading,
      exclusiveKey: `fetch:${String(args.id)}`,
      apply: (payload) => {
        if (!payload) return;
        this.setItem(payload as TSingle);
      },
    })) as unknown as TSingle | undefined;

    // Prefer store state so a superseded exclusive fetch does not return stale payload.
    return this.getById(args.id) ?? result;
  });

  /**
   * @protected
   * @method __apiCall
   * @description Invokes the inherited API call through a MobX flow.
   * @template Endpoint - A valid API method name.
   * @template Args - Arguments accepted by the endpoint.
   * @param {Endpoint} apiCall - API endpoint to invoke.
   * @param {Args extends undefined ? never : Args} args - Endpoint arguments.
   * @param {FetchPagesApiOptions} [options] - Loading behavior.
   * @returns {Promise<unknown>} The API result.
   * @action
   */
  __apiCall = flow(function* <
    Endpoint extends ApiMethodName<TApi>,
    Args extends ApiMethodArgs<TApi, Endpoint>,
  >(
    this: PaginationStore<TApi, TSingle, TPageCollection>,
    apiCall: Endpoint,
    args: Args extends undefined ? never : Args,
    { disableLoading = false }: FetchPagesApiOptions = {},
  ) {
    return (yield this.apiCall<TApi, Endpoint, Args>(apiCall, args, {
      disableLoading,
    })) as unknown;
  });
}
