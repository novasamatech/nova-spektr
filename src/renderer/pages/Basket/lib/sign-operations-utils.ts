import { Step } from '../types';

export const signOperationsUtils = {
  isNoneStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,
};

function isNoneStep(step: Step): boolean {
  return step === Step.NONE;
}

function isConfirmStep(step: Step): boolean {
  return step === Step.CONFIRM;
}

function isSignStep(step: Step): boolean {
  return step === Step.SIGN;
}

function isSubmitStep(step: Step): boolean {
  return step === Step.SUBMIT;
}
