import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleError } from '../handleError';

describe('handleError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the English default message when no option is given', async () => {
    await expect(handleError(undefined)).rejects.toThrow('Unknown error');
  });

  it('throws the extracted message and keeps the original error as cause', async () => {
    const original = new Error('boom');

    const thrown = await handleError(original).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('boom');
    expect((thrown as Error).cause).toBe(original);
  });

  it('uses options.defaultMessage when no message can be extracted', async () => {
    await expect(
      handleError(undefined, { defaultMessage: 'Unbekannter Fehler' }),
    ).rejects.toThrow('Unbekannter Fehler');
  });

  it('logs the configured default message', async () => {
    await handleError(null, { defaultMessage: 'Unbekannter Fehler' }).catch(
      () => undefined,
    );

    expect(console.error).toHaveBeenCalledWith(
      'Error Message:',
      'Unbekannter Fehler',
      null,
    );
  });

  it('prefers an extracted message over options.defaultMessage', async () => {
    await expect(
      handleError(new Error('boom'), { defaultMessage: 'Unbekannter Fehler' }),
    ).rejects.toThrow('boom');
  });

  it('falls back to the English default when options.defaultMessage is undefined', async () => {
    await expect(handleError(undefined, { defaultMessage: undefined })).rejects.toThrow(
      'Unknown error',
    );
  });
});
