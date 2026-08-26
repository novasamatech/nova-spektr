/**
 * Checks whether an effect failure is an `AbortError`.
 *
 * A `takeLast` effect aborts a run when a newer call with the same key
 * supersedes it. Such a run rejects with `AbortError`, which marks a superseded
 * attempt, not a real failure, so consumers usually filter it out of `failData`
 * before touching error state.
 */
export const isAbortError = (error: unknown): boolean => {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
};
