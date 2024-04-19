import { Step } from './types';

export const removePureProxyUtils = {
  isNoneStep,
  isWarningStep,
  isInitStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,
};

function isNoneStep(step: Step): boolean {
  return step === Step.NONE;
}

function isWarningStep(step: Step): boolean {
  return step === Step.WARNING;
}

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
