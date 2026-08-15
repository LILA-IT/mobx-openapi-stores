import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ApiType } from '../../../types';
import { callApi } from '../apiCall';

type TestApi = ApiType & {
  prefix: string;
  fetchItem: (request: { id: number }) => Promise<string>;
};

describe('callApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the requested endpoint with its arguments', async () => {
    const fetchItem = vi.fn(({ id }: { id: number }) =>
      Promise.resolve(`item-${String(id)}`),
    );
    const api = { fetchItem } as unknown as TestApi;

    const result = await callApi('fetchItem', { id: 7 }, api);

    expect(result).toBe('item-7');
    expect(fetchItem).toHaveBeenCalledWith({ id: 7 });
  });

  it('preserves the API instance as the endpoint receiver', async () => {
    const api = {
      prefix: 'resource',
      fetchItem(this: TestApi, { id }: { id: number }) {
        return Promise.resolve(`${this.prefix}-${String(id)}`);
      },
    } as unknown as TestApi;

    await expect(callApi('fetchItem', { id: 3 }, api)).resolves.toBe('resource-3');
  });

  it('throws a user-facing error when no API is provided', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(callApi<TestApi, 'fetchItem'>('fetchItem', { id: 1 })).rejects.toThrow(
      'No Api provided',
    );
  });

  it('wraps endpoint failures and preserves the original cause', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const cause = new Error('Endpoint unavailable');
    const api = {
      fetchItem: vi.fn().mockRejectedValue(cause),
    } as unknown as TestApi;

    await expect(callApi('fetchItem', { id: 1 }, api)).rejects.toMatchObject({
      message: 'Endpoint unavailable',
      cause,
    });
  });
});
