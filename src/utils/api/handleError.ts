import { resolveDefaultErrorMessage } from './defaultErrorMessage';
import { getErrorMessage } from './getErrorMessage';

/** Options for {@link handleError}. */
export type HandleErrorOptions = {
  /**
   * Message used when none can be extracted from the error (for example a falsy
   * error). Use it to localise the fallback. An empty string counts as unset. Falls back
   * to the package default from `setDefaultErrorMessage`, then to the English
   * `'Unknown error'`.
   */
  defaultMessage?: string;
};

/**
 * Logs a normalized message and throws a new error preserving the original cause.
 * Pass `options.defaultMessage` to replace the fallback message for this call, or call
 * `setDefaultErrorMessage` to replace it package-wide.
 */
export const handleError = async (
  err: unknown,
  options?: HandleErrorOptions,
): Promise<never> => {
  const msg = await getErrorMessage(
    err,
    resolveDefaultErrorMessage(options?.defaultMessage),
  );
  console.error('Error Message:', msg, err);
  throw new Error(msg, { cause: err });
};
