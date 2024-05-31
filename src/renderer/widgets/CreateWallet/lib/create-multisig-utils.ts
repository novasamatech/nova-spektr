import { Step } from './types';

export const createMultisigUtils = {
  isSignStep,
  isSubmitStep,
  isConfirmStep,
  isInitStep,
  isNoneStep,
  isNameThresholdStep,
};

function isConfirmStep(step: Step) {
  return step === Step.CONFIRM;
}

function isNameThresholdStep(step: Step) {
  return step === Step.NAMETHRESHOLD;
}

function isInitStep(step: Step) {
  return step === Step.INIT;
}

function isSignStep(step: Step) {
  return step === Step.SIGN;
}

function isSubmitStep(step: Step) {
  return step === Step.SUBMIT;
}

function isNoneStep(step: Step): boolean {
  return step === Step.NONE;
}
