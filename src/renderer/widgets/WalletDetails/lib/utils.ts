import { ForgetStep, ReconnectStep } from './constants';

export const wcDetailsUtils = {
  isNotStarted,
  isReconnecting,
  isRejected,
  isReadyToReconnect,
  isConfirmation,
};

export const walletDetailsUtils = {
  isForgetModalOpen,
};

function isNotStarted(step: ReconnectStep, connected: boolean): boolean {
  return [ReconnectStep.NOT_STARTED, ReconnectStep.CONFIRMATION].includes(step) && connected;
}

function isConfirmation(step: ReconnectStep): boolean {
  return step === ReconnectStep.CONFIRMATION;
}

function isReconnecting(step: ReconnectStep): boolean {
  return step === ReconnectStep.RECONNECTING;
}

function isRejected(step: ReconnectStep): boolean {
  return step === ReconnectStep.REJECTED;
}

function isReadyToReconnect(step: ReconnectStep, connected: boolean): boolean {
  return isRejected(step) || (step === ReconnectStep.NOT_STARTED && !connected);
}

function isForgetModalOpen(step: ForgetStep): boolean {
  return [ForgetStep.FORGETTING, ForgetStep.SUCCESS].includes(step);
}
