import { flow, isObservableMap } from 'mobx';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ApiType } from '../../types/ApiType';
import {
  type FetchPageParams,
  type MultiPageResponse,
  PaginationStore,
} from '../PaginationStore';

type Item = {
  id: string;
  name: string;
};

class TestPaginationStore extends PaginationStore<ApiType, Item> {
  fetchPagesApiMock =
    vi.fn<
      (
        pages: number[],
        params: FetchPageParams,
        options?: { disableLoading?: boolean },
      ) => Promise<MultiPageResponse<Item> | undefined>
    >();

  _fetchPagesApi = flow(function* (
    this: TestPaginationStore,
    pages: number[],
    params: FetchPageParams,
    options?: { disableLoading?: boolean },
  ): Generator<
    Promise<MultiPageResponse<Item> | undefined>,
    MultiPageResponse<Item> | undefined,
    MultiPageResponse<Item> | undefined
  > {
    return yield this.fetchPagesApiMock(pages, params, options);
  });
}

function createResponse(
  page: number,
  data: Item[],
  total = data.length,
): MultiPageResponse<Item> {
  return {
    pages: [
      {
        data,
        pagination: {
          currentPage: page,
          total,
          totalPages: 3,
          pageSize: 20,
          sort: 'updatedAt:desc',
        },
      },
    ],
    pagination: {
      total,
      totalPages: 3,
      pageSize: 20,
      sort: 'updatedAt:desc',
    },
  };
}

describe('PaginationStore behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses an observable map for the page cache', () => {
    const store = new TestPaginationStore('PaginationTest');

    expect(isObservableMap(store.pagesCache)).toBe(true);
  });

  it('returns the cached page without refetching it when params match', async () => {
    const store = new TestPaginationStore('PaginationTest');
    store._pagesCache.set(1, [{ id: '1', name: 'Cached' }]);
    store._setQueryParams({ pageSize: 20, sort: 'updatedAt:desc' });

    const result = await store.fetchPage(1, undefined, { useCache: true });

    expect(result?.data).toEqual([{ id: '1', name: 'Cached' }]);
    expect(store.fetchPagesApiMock).toHaveBeenCalledOnce();
    expect(store.fetchPagesApiMock).toHaveBeenCalledWith(
      [2],
      { pageSize: 20, sort: 'updatedAt:desc' },
      { disableLoading: true },
    );
  });

  it('invalidates stale pages when query params change', async () => {
    const store = new TestPaginationStore('PaginationTest', {
      prefetchCount: 0,
    });
    store._pagesCache.set(2, [{ id: 'stale', name: 'Stale' }]);
    store._setQueryParams({ pageSize: 20, sort: 'updatedAt:desc' });
    store.fetchPagesApiMock.mockResolvedValueOnce(
      createResponse(1, [{ id: 'fresh', name: 'Fresh' }]),
    );

    const result = await store.fetchPage(1, { sort: 'name:asc' });

    expect(result?.data).toEqual([{ id: 'fresh', name: 'Fresh' }]);
    expect(store.pagesCache.has(2)).toBe(false);
  });

  it('forwards disableLoading to the primary page request', async () => {
    const store = new TestPaginationStore('PaginationTest', {
      prefetchCount: 0,
    });
    store.fetchPagesApiMock.mockResolvedValueOnce(createResponse(1, []));

    await store.fetchPage(1, undefined, { disableLoading: true });

    expect(store.fetchPagesApiMock).toHaveBeenCalledWith(
      [1],
      { pageSize: 20, sort: 'updatedAt:desc' },
      { disableLoading: true },
    );
  });

  it('finds items across cached pages', () => {
    const store = new TestPaginationStore('PaginationTest');
    store._pagesCache.set(2, [{ id: '2', name: 'Second page' }]);

    expect(store.getById('2')).toEqual({ id: '2', name: 'Second page' });
  });

  it('updates an item wherever it is cached', () => {
    const store = new TestPaginationStore('PaginationTest');
    store._pagesCache.set(2, [{ id: '2', name: 'Before' }]);

    store.editItem({ id: '2', name: 'After' }, false);

    expect(store.pagesCache.get(2)).toEqual([{ id: '2', name: 'After' }]);
  });

  it('removes cached items and decrements total without going below zero', () => {
    const store = new TestPaginationStore('PaginationTest');
    store._pagesCache.set(1, [{ id: '1', name: 'Only item' }]);
    store._setPaginationState({
      currentPage: 1,
      total: 0,
      totalPages: 1,
      pageSize: 20,
      sort: 'updatedAt:desc',
    });

    store.removeItem('1');

    expect(store.collection).toEqual([]);
    expect(store.paginationState.total).toBe(0);
  });

  it('clears cached pages and returns to page one when resetting the list', () => {
    const store = new TestPaginationStore('PaginationTest');
    store._pagesCache.set(3, [{ id: '3', name: 'Third page' }]);
    store._setPaginationState({
      currentPage: 3,
      total: 42,
      totalPages: 3,
      pageSize: 20,
      sort: 'name:asc',
    });

    store.resetListViewToFirstPage();

    expect(store.pagesCache.size).toBe(0);
    expect(store.paginationState).toEqual({
      currentPage: 1,
      page: 1,
      total: 42,
      totalPages: 3,
      pageSize: 20,
      sort: 'name:asc',
    });
  });

  describe('last request wins', () => {
    type Deferred<T> = {
      promise: Promise<T>;
      resolve: (value: T) => void;
      reject: (reason?: unknown) => void;
    };

    function createDeferred<T>(): Deferred<T> {
      let resolve!: (value: T) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    it('keeps the newer page when an older fetchPage resolves last', async () => {
      const store = new TestPaginationStore('PaginationTest', { prefetchCount: 0 });
      const older = createDeferred<MultiPageResponse<Item> | undefined>();
      const newer = createDeferred<MultiPageResponse<Item> | undefined>();
      store.fetchPagesApiMock
        .mockReturnValueOnce(older.promise)
        .mockReturnValueOnce(newer.promise);

      const olderFetch = store.fetchPage(1, { q: 'ab' });
      const newerFetch = store.fetchPage(1, { q: 'abc' });

      newer.resolve(createResponse(1, [{ id: 'abc', name: 'abc' }], 1));
      await expect(newerFetch).resolves.toMatchObject({
        data: [{ id: 'abc', name: 'abc' }],
      });
      older.resolve(createResponse(1, [{ id: 'ab', name: 'ab' }], 7));

      await expect(olderFetch).resolves.toBeUndefined();
      expect(store.collection).toEqual([{ id: 'abc', name: 'abc' }]);
      expect(store.paginationState.total).toBe(1);
      expect(store._queryParams).toMatchObject({ q: 'abc' });
    });

    it('keeps the newer page and sets no error when an older fetchPage rejects last', async () => {
      const store = new TestPaginationStore('PaginationTest', { prefetchCount: 0 });
      const older = createDeferred<MultiPageResponse<Item> | undefined>();
      const newer = createDeferred<MultiPageResponse<Item> | undefined>();
      store.fetchPagesApiMock
        .mockReturnValueOnce(older.promise)
        .mockReturnValueOnce(newer.promise);

      const olderFetch = store.fetchPage(1, { sort: 'name:asc' });
      const newerFetch = store.fetchPage(1, { sort: 'updatedAt:desc' });

      newer.resolve(createResponse(1, [{ id: 'new', name: 'Newer' }]));
      await newerFetch;
      older.reject(new Error('older request failed'));

      await expect(olderFetch).resolves.toBeUndefined();
      expect(store.collection).toEqual([{ id: 'new', name: 'Newer' }]);
      expect(store._queryParams).toMatchObject({ sort: 'updatedAt:desc' });
    });

    it('does not apply an older page when a cache hit happened in between', async () => {
      const store = new TestPaginationStore('PaginationTest', { prefetchCount: 0 });
      store._pagesCache.set(1, [{ id: '1', name: 'Cached' }]);
      store._setQueryParams({ pageSize: 20, sort: 'updatedAt:desc' });
      const older = createDeferred<MultiPageResponse<Item> | undefined>();
      store.fetchPagesApiMock.mockReturnValueOnce(older.promise);

      const olderFetch = store.fetchPage(2);
      await store.fetchPage(1, undefined, { useCache: true });
      older.resolve(createResponse(2, [{ id: '2', name: 'Second' }]));

      await expect(olderFetch).resolves.toBeUndefined();
      expect(store.paginationState.currentPage).toBe(1);
    });

    it('never lets a prefetch for older params overwrite the newer pages', async () => {
      const store = new TestPaginationStore('PaginationTest', { prefetchCount: 1 });
      const olderPrefetch = createDeferred<MultiPageResponse<Item> | undefined>();
      store.fetchPagesApiMock
        .mockResolvedValueOnce(createResponse(1, [{ id: 'a1', name: 'a page 1' }]))
        .mockReturnValueOnce(olderPrefetch.promise)
        .mockResolvedValueOnce(createResponse(1, [{ id: 'b1', name: 'b page 1' }]))
        .mockResolvedValueOnce(undefined);

      await store.fetchPage(1, { q: 'a' });
      await store.fetchPage(1, { q: 'b' });
      expect(store.fetchPagesApiMock).toHaveBeenCalledTimes(4);

      olderPrefetch.resolve(createResponse(2, [{ id: 'a2', name: 'a page 2' }]));
      await olderPrefetch.promise;
      await Promise.resolve();

      expect(store.pagesCache.has(2)).toBe(false);
      expect(store.collection).toEqual([{ id: 'b1', name: 'b page 1' }]);
      expect(store._queryParams).toMatchObject({ q: 'b' });
    });

    it('catches a failed prefetch instead of rejecting in the background', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const store = new TestPaginationStore('PaginationTest', { prefetchCount: 1 });
      store.fetchPagesApiMock
        .mockResolvedValueOnce(createResponse(1, [{ id: '1', name: 'First' }]))
        .mockRejectedValueOnce(new Error('prefetch failed'))
        .mockRejectedValueOnce(new Error('prefetch failed'));

      await store.fetchPage(1);
      await expect(
        store._prefetchAdjacentPages(1, store._queryParams as FetchPageParams),
      ).resolves.toBeUndefined();

      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
