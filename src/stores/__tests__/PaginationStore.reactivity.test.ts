import { flow } from 'mobx';
import { toFlowGeneratorFunction } from 'to-flow-generator-function';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ApiType } from '../../types/ApiType';
import {
  type FetchPageParams,
  type MultiPageResponse,
  PaginationStore,
} from '../PaginationStore';
import { expectBudget, observeSignal } from './helpers/reactivity';

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

function pagesCacheFingerprint(store: TestPaginationStore): string {
  return Array.from(store.pagesCache.entries())
    .map(
      ([page, items]) =>
        `${String(page)}:${items.map(({ id, name }) => `${id}:${name}`).join(',')}`,
    )
    .join('|');
}

function collectionFingerprint(store: TestPaginationStore): string {
  return store.collection.map(({ id, name }) => `${id}:${name}`).join(',');
}

function paginationStateFingerprint(store: TestPaginationStore): string {
  const { currentPage, page, total, totalPages, pageSize, sort } = store.paginationState;
  return [currentPage, page, total, totalPages, pageSize, sort].join(':');
}

describe('PaginationStore reactivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchPage updating cache: pagesCache budget 1', async () => {
    const store = new TestPaginationStore('PaginationTest', { prefetchCount: 0 });
    store.fetchPagesApiMock.mockResolvedValueOnce(
      createResponse(1, [{ id: '1', name: 'One' }], 1),
    );
    const handle = observeSignal(() => pagesCacheFingerprint(store));

    await store.fetchPage(1);

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith('1:1:One', '', expect.anything());
    handle.dispose();
  });

  it('fetchPage updating cache: collection budget 1', async () => {
    const store = new TestPaginationStore('PaginationTest', { prefetchCount: 0 });
    store.fetchPagesApiMock.mockResolvedValueOnce(
      createResponse(1, [{ id: '1', name: 'One' }], 1),
    );
    const handle = observeSignal(() => collectionFingerprint(store));

    await store.fetchPage(1);

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith('1:One', '', expect.anything());
    handle.dispose();
  });

  it('fetchPage updating cache: paginationState budget 1', async () => {
    const store = new TestPaginationStore('PaginationTest', { prefetchCount: 0 });
    store.fetchPagesApiMock.mockResolvedValueOnce(
      createResponse(1, [{ id: '1', name: 'One' }], 42),
    );
    const handle = observeSignal(() => paginationStateFingerprint(store));

    await store.fetchPage(1);

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      '1:1:42:3:20:updatedAt:desc',
      '1:1:0:0:20:updatedAt:desc',
      expect.anything(),
    );
    handle.dispose();
  });

  it('useCache hit leaves pagesCache budget 0', async () => {
    const store = new TestPaginationStore('PaginationTest', { prefetchCount: 0 });
    store._pagesCache.set(1, [{ id: '1', name: 'Cached' }]);
    store._setQueryParams({ pageSize: 20, sort: 'updatedAt:desc' });
    store._setPaginationState({
      currentPage: 1,
      total: 1,
      totalPages: 1,
      pageSize: 20,
      sort: 'updatedAt:desc',
    });
    const handle = observeSignal(() => pagesCacheFingerprint(store));

    await store.fetchPage(1, undefined, { useCache: true });

    expectBudget(handle, 0);
    expect(store.fetchPagesApiMock).not.toHaveBeenCalled();
    handle.dispose();
  });
});
