const hasErrorResponse = (error: unknown): error is { response: Response } => {
  if (typeof error !== 'object' || error === null || !('response' in error)) return false;
  const { response } = error;
  return (
    typeof response === 'object' &&
    response !== null &&
    'text' in response &&
    typeof response.text === 'function' &&
    'status' in response &&
    typeof response.status === 'number'
  );
};

/**
 * Extracts a human-readable message from OpenAPI / fetch errors.
 * Default message is English for the public package surface.
 */
export const getErrorMessage = async (
  error: unknown,
  defaultMessage: string | undefined = 'Unknown error',
): Promise<string> => {
  if (hasErrorResponse(error)) {
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
