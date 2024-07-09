import { SubmitStep } from './types';

export const submitUtils = {
  isLoadingStep,
  isSuccessStep,
  iswarningStep,
  isErrorStep,
};

function isLoadingStep(step: SubmitStep): boolean {
  return step === SubmitStep.LOADING;
}

function isSuccessStep(step: SubmitStep): boolean {
  return step === SubmitStep.SUCCESS;
}

function iswarningStep(step: SubmitStep): boolean {
  return step === SubmitStep.WARNING;
}

function isErrorStep(step: SubmitStep): boolean {
  return step === SubmitStep.ERROR;
}
