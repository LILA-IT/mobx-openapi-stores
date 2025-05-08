import { ResponseError } from '../../openapi-generator';

export const getErrorMessage = async (
  error: unknown,
  defaultMessage: string | undefined = 'Unbekannter Fehler',
): Promise<string> => {
  if (error instanceof ResponseError) {
    return await error.response
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ?.json()
      .then((json: { message: string }) => json.message);
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (!error) return defaultMessage;
  return JSON.stringify(error);
};
