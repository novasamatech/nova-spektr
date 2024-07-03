import { Step } from '../types/basket-page-types';

export const basketPageUtils = {
  isSelectStep,
  isSignStep,
};

function isSelectStep(step: Step): boolean {
  return step === Step.SELECT;
}

function isSignStep(step: Step): boolean {
  return step === Step.SIGN;
}
