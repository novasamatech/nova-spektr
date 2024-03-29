import { SubmitStep } from './types';

export const submitProxyUtils = {
  isLoadingStep,
  isSuccessStep,
  isErrorStep,
};

function isLoadingStep(step: SubmitStep): boolean {
  return step === SubmitStep.LOADING;
}

function isSuccessStep(step: SubmitStep): boolean {
  return step === SubmitStep.SUCCESS;
}

function isErrorStep(step: SubmitStep): boolean {
  return step === SubmitStep.ERROR;
}
