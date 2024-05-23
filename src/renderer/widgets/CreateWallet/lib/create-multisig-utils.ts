import { Wallet } from '@/src/renderer/shared/core';
import { Step } from './types';
import { walletUtils } from '@entities/wallet';

export const createMultisigUtils = {
  isSignStep,
  isSubmitStep,
  isConfirmStep,
  isInitStep,
  noSignatoryWallet,
  isNameThresholdStep,
};

function isConfirmStep(step: Step) {
  return step === Step.CONFIRM;
}

function isNameThresholdStep(step: Step) {
  return step === Step.NAMETHRESHOLD;
}

function isInitStep(step: Step) {
  return step === Step.INIT;
}

function isSignStep(step: Step) {
  return step === Step.SIGN;
}

function isSubmitStep(step: Step) {
  return step === Step.SUBMIT;
}

function noSignatoryWallet(wallets: Wallet[]) {
  return wallets.every((wallet) => !walletUtils.isWatchOnly(wallet) || !walletUtils.isMultisig(wallet));
}
