import { getErrorMessage } from './getErrorMessage';

export const handleError = async (err: unknown) => {
  const msg = await getErrorMessage(err);
  console.error('Error Message:', msg, err);
  throw new Error(msg);
};
