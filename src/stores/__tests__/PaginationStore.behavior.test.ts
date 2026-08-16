import { flow, isObservableMap } from 'mobx';
import { toFlowGeneratorFunction } from 'to-flow-generator-function';
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

  _fetchPagesApi = flow(
    toFlowGeneratorFunction(
      async (
        pages: number[],
        params: FetchPageParams,
        options?: { disableLoading?: boolean },
      ): Promise<MultiPageResponse<Item> | undefined> =>
        await this.fetchPagesApiMock(pages, params, options),
    ),
  );
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
});
