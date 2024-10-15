export const enum Step {
  NONE,
  INIT,
  SELECT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
  LIST,
  SELECT_TRACK,
  CUSTOM_DELEGATION,
}

/**
 * Check if current step equal to the target step
 *
 * @param step Current step
 * @param targetStep Target step
 *
 * @returns {boolean}
 */
export function isStep<T>(step: T, targetStep: T): boolean {
  return step === targetStep;
}
