import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiStore } from '../../../stores/ApiStore';
import { type ApiType } from '../../../types';
import { callApi } from '../apiCall';
import { setDefaultErrorMessage } from '../defaultErrorMessage';
import { handleError } from '../handleError';

type TestApi = ApiType & {
  fail: (request: { id: number }) => Promise<string>;
};

// A falsy rejection is the case that needs the fallback message.
const createApi = () =>
  ({
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    fail: () => Promise.reject(undefined),
  }) as unknown as TestApi;

const createStore = () => {
  const store = new ApiStore<TestApi>('DefaultMessageStore');
  store.setApi(createApi());
  return store;
};

describe('setDefaultErrorMessage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    setDefaultErrorMessage(undefined);
    vi.restoreAllMocks();
  });

  it('keeps the English default without configuration', async () => {
    await expect(handleError(undefined)).rejects.toThrow('Unknown error');
    await expect(callApi('fail', { id: 1 }, createApi())).rejects.toThrow(
      'Unknown error',
    );
    await expect(
      createStore().apiCall<TestApi, 'fail', { id: number }>('fail', { id: 1 }),
    ).rejects.toThrow('Unknown error');
  });

  it('applies the package default to handleError, callApi and ApiStore.apiCall', async () => {
    setDefaultErrorMessage('Unbekannter Fehler');

    await expect(handleError(undefined)).rejects.toThrow('Unbekannter Fehler');
    await expect(callApi('fail', { id: 1 }, createApi())).rejects.toThrow(
      'Unbekannter Fehler',
    );
    await expect(
      createStore().apiCall<TestApi, 'fail', { id: number }>('fail', { id: 1 }),
    ).rejects.toThrow('Unbekannter Fehler');
  });

  it('resets to the English default when called with undefined', async () => {
    setDefaultErrorMessage('Unbekannter Fehler');
    setDefaultErrorMessage(undefined);

    await expect(handleError(undefined)).rejects.toThrow('Unknown error');
  });

  it('treats an empty package default as unset', async () => {
    setDefaultErrorMessage('Unbekannter Fehler');
    setDefaultErrorMessage('');

    await expect(handleError(undefined)).rejects.toThrow('Unknown error');
  });

  it('prefers the per-call default over the package default', async () => {
    setDefaultErrorMessage('Package');

    await expect(handleError(undefined, { defaultMessage: 'Call' })).rejects.toThrow(
      'Call',
    );
    await expect(
      callApi('fail', { id: 1 }, createApi(), { defaultErrorMessage: 'Call' }),
    ).rejects.toThrow('Call');
    await expect(
      createStore().apiCall<TestApi, 'fail', { id: number }>(
        'fail',
        { id: 1 },
        { defaultErrorMessage: 'Call' },
      ),
    ).rejects.toThrow('Call');
  });

  it('uses the per-call default without a package default', async () => {
    await expect(
      callApi('fail', { id: 1 }, createApi(), { defaultErrorMessage: 'Call' }),
    ).rejects.toThrow('Call');
  });

  it('treats an empty per-call default as unset and falls back to the package default', async () => {
    setDefaultErrorMessage('Package');

    await expect(handleError(undefined, { defaultMessage: '' })).rejects.toThrow(
      'Package',
    );
    await expect(
      callApi('fail', { id: 1 }, createApi(), { defaultErrorMessage: '' }),
    ).rejects.toThrow('Package');
    await expect(
      createStore().apiCall<TestApi, 'fail', { id: number }>(
        'fail',
        { id: 1 },
        { defaultErrorMessage: '' },
      ),
    ).rejects.toThrow('Package');
  });

  it('falls back to English when both defaults are empty', async () => {
    await expect(handleError(undefined, { defaultMessage: '' })).rejects.toThrow(
      'Unknown error',
    );
  });

  it('does not override a message extracted from the error', async () => {
    setDefaultErrorMessage('Package');

    await expect(handleError(new Error('boom'))).rejects.toThrow('boom');
  });
});
