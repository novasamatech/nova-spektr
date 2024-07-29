import { Step } from './types';

export const createMultisigUtils = {
  isStep,
  isNotFirstStep,
};

/**
 * Check if current step equal to the target step
 * @param step  current step
 * @param targetStep target step
 * @return {boolean}
 */
function isStep(step: Step, targetStep: Step): boolean {
  return step === targetStep;
}

function isNotFirstStep(step: Step) {
  return step !== Step.NAME_NETWORK;
}
