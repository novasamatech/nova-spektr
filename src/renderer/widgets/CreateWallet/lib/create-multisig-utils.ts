import { Step } from './types';

export const createMultisigUtils = {
  isNotFirstStep,
};

function isNotFirstStep(step: Step) {
  return step !== Step.NAME_NETWORK;
}
