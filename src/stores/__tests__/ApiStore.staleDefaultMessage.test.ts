import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ApiType } from '../../types';
import { setDefaultErrorMessage } from '../../utils/api/defaultErrorMessage';
import { ApiStore } from '../ApiStore';

/*
 * Follow-up to issue #8: stale rejections built before the body read must use the same
 * default message as every other `apiCall` failure (per-call, then package, then 'Unknown error').
 */

type TestApi = ApiType & {
  getValue: (request: { key: string }) => Promise<string>;
};

const createStore = (rejectWith: unknown) => {
  const getValue = vi.fn(() => Promise.reject(rejectWith as Error));
  const store = new ApiStore<TestApi>('StaleDefaultMessageTestStore');
  store.setApi({ getValue });
  return { store, getValue };
};

/** An aborted signal whose reason carries no extractable message. */
const abortedSignalWithoutMessage = () => {
  const controller = new AbortController();
  controller.abort('');
  return controller.signal;
};

type Path = {
  name: string;
  /** Runs one stale failure that has no extractable message. */
  run: (defaultErrorMessage?: string) => Promise<unknown>;
};

const paths: Path[] = [
  {
    name: 'early-stale (isStale marks a message-less error)',
    run: (defaultErrorMessage) => {
      const { store } = createStore(undefined);
      return store.apiCall<TestApi, 'getValue', { key: string }>(
        'getValue',
        { key: 'a' },
        { isStale: () => true, defaultErrorMessage },
      );
    },
  },
  {
    name: 'abort-before-start (signal already aborted without a message)',
    run: (defaultErrorMessage) => {
      const { store, getValue } = createStore(undefined);
      const result = store.apiCall<TestApi, 'getValue', { key: string }>(
        'getValue',
        { key: 'a' },
        { signal: abortedSignalWithoutMessage(), defaultErrorMessage },
      );
      void result
        .catch(() => undefined)
        .then(() => expect(getValue).not.toHaveBeenCalled());
      return result;
    },
  },
];

describe.each(paths)('ApiStore stale rejection default message: $name', ({ run }) => {
  afterEach(() => {
    setDefaultErrorMessage(undefined);
  });

  it('uses the per-call defaultErrorMessage', async () => {
    await expect(run('Per-call default')).rejects.toThrow('Per-call default');
  });

  it('uses the package default from setDefaultErrorMessage', async () => {
    setDefaultErrorMessage('Package default');
    await expect(run()).rejects.toThrow('Package default');
  });

  it('prefers the per-call default over the package default', async () => {
    setDefaultErrorMessage('Package default');
    await expect(run('Per-call default')).rejects.toThrow('Per-call default');
  });

  it('keeps Unknown error when nothing is configured', async () => {
    await expect(run()).rejects.toThrow('Unknown error');
  });
});
