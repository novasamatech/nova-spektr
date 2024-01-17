import { Step } from './types';

export const addProxyUtils = {
  isInitStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,
};

function isInitStep(step: Step): boolean {
  return step === Step.INIT;
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
