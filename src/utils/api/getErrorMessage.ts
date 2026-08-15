import { ResponseError } from '../../openapi-generator';

/**
 * Extracts a human-readable message from OpenAPI / fetch errors.
 * Default message is English for the public package surface.
 */
export const getErrorMessage = async (
  error: unknown,
  defaultMessage: string | undefined = 'Unknown error',
): Promise<string> => {
  if (error instanceof ResponseError) {
    const response = error.response;

    try {
      const text = await response.text();
      if (!text) {
        return response.statusText || `HTTP ${String(response.status)}` || defaultMessage;
      }

      const parsed = JSON.parse(text) as { message?: string };
      return parsed.message ?? text;
    } catch {
      return response.statusText || `HTTP ${String(response.status)}` || defaultMessage;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (!error) return defaultMessage;
  return JSON.stringify(error);
};
