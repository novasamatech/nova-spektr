import { Step } from './types';

export const createMultisigUtils = {
  isSignStep,
  isSubmitStep,
  isConfirmStep,
  isInitStep,
};

function isConfirmStep(step: Step) {
  return step === Step.CONFIRM;
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
