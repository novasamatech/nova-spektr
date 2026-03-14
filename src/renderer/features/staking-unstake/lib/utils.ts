import { Step } from './types';

export const unstakeUtils = {
  isNoneStep: (step: Step): boolean => step === Step.NONE,
  isInitStep: (step: Step): boolean => step === Step.INIT,
  isConfirmStep: (step: Step): boolean => step === Step.CONFIRM,
  isSignStep: (step: Step): boolean => step === Step.SIGN,
  isSubmitStep: (step: Step): boolean => step === Step.SUBMIT,
  isBasketStep: (step: Step): boolean => step === Step.BASKET,
};
