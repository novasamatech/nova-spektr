export const enum Step {
  NONE,
  INIT,
  SELECT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
  LIST,
}

/**
 * Check if current step equal to the target step
 * @param step  current step
 * @param targetStep target step
 * @return {boolean}
 */
export function isStep<T>(step: T, targetStep: T): boolean {
  return step === targetStep;
}
