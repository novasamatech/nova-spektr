import { Step, TxWrappers } from './types';

export const removePureProxyUtils = {
  isNoneStep,
  isWarningStep,
  isInitStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,

  hasMultisig,
  hasProxy,
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

function hasMultisig(txWrappers: TxWrappers): boolean {
  return txWrappers.includes('multisig');
}

function hasProxy(txWrappers: TxWrappers): boolean {
  return txWrappers.includes('proxy');
}
