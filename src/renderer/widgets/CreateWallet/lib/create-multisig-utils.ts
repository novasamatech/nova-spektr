import { Step } from './types';

export const createMultisigUtils = {
  isSignStep,
  isSubmitStep,
  isConfirmStep,
  isNameNetworkStep,
  isSignatoriesThresholdStep,
  isNotFirstStep,
};

function isConfirmStep(step: Step) {
  return step === Step.CONFIRM;
}

function isSignatoriesThresholdStep(step: Step) {
  return step === Step.SIGNATORIES_THRESHOLD;
}

function isNameNetworkStep(step: Step) {
  return step === Step.NAME_NETWORK;
}

function isSignStep(step: Step) {
  return step === Step.SIGN;
}

function isSubmitStep(step: Step) {
  return step === Step.SUBMIT;
}

function isNotFirstStep(step: Step) {
  return step > Step.NAME_NETWORK;
}
