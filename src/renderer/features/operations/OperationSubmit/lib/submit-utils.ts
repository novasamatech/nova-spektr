import { ExtrinsicResult, SubmitStep } from './types';

export const submitUtils = {
  isLoadingStep,
  isSuccessStep,
  isWarningStep,
  isErrorStep,

  isSuccessResult,
  isErrorResult,
};

function isLoadingStep(step: SubmitStep): boolean {
  return step === SubmitStep.LOADING;
}

function isSuccessStep(step: SubmitStep): boolean {
  return step === SubmitStep.SUCCESS;
}

function isWarningStep(step: SubmitStep): boolean {
  return step === SubmitStep.WARNING;
}

function isErrorStep(step: SubmitStep): boolean {
  return step === SubmitStep.ERROR;
}

function isSuccessResult(result: ExtrinsicResult): boolean {
  return result === ExtrinsicResult.SUCCESS;
}

function isErrorResult(result: ExtrinsicResult): boolean {
  return result === ExtrinsicResult.ERROR;
}
