import { SubmitStep } from './types';

export const submitUtils = {
  isLoadingStep,
  isSuccessStep,
  isMixedResultStep,
  isErrorStep,
};

function isLoadingStep(step: SubmitStep): boolean {
  return step === SubmitStep.LOADING;
}

function isSuccessStep(step: SubmitStep): boolean {
  return step === SubmitStep.SUCCESS;
}

function isMixedResultStep(step: SubmitStep): boolean {
  return step === SubmitStep.SUCCESS;
}

function isErrorStep(step: SubmitStep): boolean {
  return step === SubmitStep.ERROR;
}
