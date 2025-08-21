import { type ResponseError } from '../../openapi-generator';

export const getErrorMessage = async (
  error: unknown,
  defaultMessage: string | undefined = 'Unbekannter Fehler',
): Promise<string> => {
  // @ts-expect-error cannot use instanceof because of the way the api is generated
  if ('response' in error) {
    return await (error as ResponseError).response
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      ?.json()
      .then((json: { message: string }) => JSON.stringify(json.message));
  } else if (error instanceof Error) {
    return error.message;
  } else if (!error) return defaultMessage;
  return JSON.stringify(error);
};
