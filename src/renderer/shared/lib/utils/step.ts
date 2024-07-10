export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

/**
 * Check if current step equal to the target step
 * @param step  current step
 * @param targetStep target step
 * @return {boolean}
 */
export function isStep(step: Step, targetStep: Step): boolean {
  return step === targetStep;
}
