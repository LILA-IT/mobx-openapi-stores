import { getErrorMessage } from './getErrorMessage';

/** Logs a normalized message and throws a new error preserving the original cause. */
export const handleError = async (err: unknown): Promise<never> => {
  const msg = await getErrorMessage(err);
  console.error('Error Message:', msg, err);
  throw new Error(msg, { cause: err });
};
