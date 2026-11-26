import { getErrorMessage } from './getErrorMessage';

/** Options for {@link handleError}. */
export type HandleErrorOptions = {
  /**
   * Message used when none can be extracted from the error (for example a falsy
   * error). Use it to localise the fallback. Defaults to the English `'Unknown error'`.
   */
  defaultMessage?: string;
};

/**
 * Logs a normalized message and throws a new error preserving the original cause.
 * Pass `options.defaultMessage` to replace the English fallback message.
 */
export const handleError = async (
  err: unknown,
  options?: HandleErrorOptions,
): Promise<never> => {
  const msg = await getErrorMessage(err, options?.defaultMessage);
  console.error('Error Message:', msg, err);
  throw new Error(msg, { cause: err });
};
