import { flow } from 'mobx';
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
  details?: {
    address: { city: string };
    tags: string[];
  };
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

  it('keeps fetched page collection data deeply observable', async () => {
    const store = new TestPaginationStore('PaginationDeepCollection', {
      prefetchCount: 0,
    });
    store.fetchPagesApiMock.mockResolvedValueOnce(
      createResponse(1, [
        {
          id: '1',
          name: 'One',
          details: { address: { city: 'Berlin' }, tags: ['initial'] },
        },
      ]),
    );

    await store.fetchPage(1);
    const handle = observeSignal(() => store.collection[0].details?.address.city ?? '');
    const item = store.collection[0];
    if (!item.details) throw new Error('Expected fetched nested data');

    item.details.address.city = 'Hamburg';

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith('Hamburg', 'Berlin', expect.anything());
    handle.dispose();
  });

  it('keeps fetched page cache data deeply observable', async () => {
    const store = new TestPaginationStore('PaginationDeepCache', {
      prefetchCount: 0,
    });
    store.fetchPagesApiMock.mockResolvedValueOnce(
      createResponse(1, [
        {
          id: '1',
          name: 'One',
          details: { address: { city: 'Berlin' }, tags: ['initial'] },
        },
      ]),
    );

    await store.fetchPage(1);
    const handle = observeSignal(
      () => store.pagesCache.get(1)?.[0]?.details?.tags.join(',') ?? '',
    );
    const item = store.pagesCache.get(1)?.[0];
    if (!item?.details) throw new Error('Expected cached nested data');

    item.details.tags.push('added');

    expectBudget(handle, 1);
    expect(handle.observer).toHaveBeenCalledWith(
      'initial,added',
      'initial',
      expect.anything(),
    );
    handle.dispose();
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
