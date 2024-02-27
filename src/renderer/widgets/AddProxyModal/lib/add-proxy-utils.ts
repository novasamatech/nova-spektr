import { Step } from './types';

export const addProxyUtils = {
  isInitStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,

  hasMultisig,
  hasProxy,
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

function hasMultisig(txWrappers: ('proxy' | 'multisig')[]): boolean {
  return txWrappers.includes('multisig');
}

function hasProxy(txWrappers: ('proxy' | 'multisig')[]): boolean {
  return txWrappers.includes('proxy');
}
