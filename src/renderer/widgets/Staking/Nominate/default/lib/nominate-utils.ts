import { Step } from './types';

export const nominateUtils = {
  isNoneStep,
  isInitStep,
  isValidatorsStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,
  isBasketStep,
};

function isNoneStep(step: Step): boolean {
  return step === Step.NONE;
}

function isInitStep(step: Step): boolean {
  return step === Step.INIT;
}

function isValidatorsStep(step: Step): boolean {
  return step === Step.VALIDATORS;
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

function isBasketStep(step: Step): boolean {
  return step === Step.BASKET;
}
