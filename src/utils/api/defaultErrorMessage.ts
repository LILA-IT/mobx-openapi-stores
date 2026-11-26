/** English fallback used when neither a per-call nor a package default is set. */
const BUILT_IN_DEFAULT_ERROR_MESSAGE = 'Unknown error';

const isSet = (message: string | undefined): message is string =>
  message !== undefined && message !== '';

let packageDefaultErrorMessage: string | undefined;

/**
 * Sets the package-wide fallback message used when no message can be extracted from an
 * error, for example to localise it once for every `handleError`, `callApi` and
 * `ApiStore.apiCall` failure.
 *
 * Precedence: the per-call value (`defaultMessage` of `handleError`, `defaultErrorMessage`
 * of `callApi` and `ApiStore.apiCall`), then this package default, then the English
 * `'Unknown error'`. An empty string counts as unset. Pass `undefined` to reset to
 * `'Unknown error'` (this is also how tests can undo their configuration).
 *
 * The value is module state: it is shared by everything importing the same copy of the package.
 */
export const setDefaultErrorMessage = (message: string | undefined): void => {
  packageDefaultErrorMessage = isSet(message) ? message : undefined;
};

/**
 * Resolves the fallback message: `perCall`, then the package default, then `'Unknown error'`.
 * Empty strings count as unset.
 * @internal
 */
export const resolveDefaultErrorMessage = (perCall?: string): string =>
  isSet(perCall)
    ? perCall
    : (packageDefaultErrorMessage ?? BUILT_IN_DEFAULT_ERROR_MESSAGE);
