import { ForgetStep, ReconnectStep } from './const';

const isAccountsStep = (step: ReconnectStep, connected: boolean) => step === ReconnectStep.NOT_STARTED && connected;
const isReconnectingStep = (step: ReconnectStep) => step === ReconnectStep.RECONNECTING;
const isReadyToReconnectStep = (step: ReconnectStep, connected: boolean) =>
  (step === ReconnectStep.NOT_STARTED && !connected) || step === ReconnectStep.REJECTED;

const isRejected = (step: ReconnectStep) => step === ReconnectStep.REJECTED;

export const walletConnectDetailsUtils = {
  isAccountsStep,
  isReconnectingStep,
  isReadyToReconnectStep,
  isRejected,
};

const isForgetModalOpen = (step: ForgetStep) => [ForgetStep.FORGETTING, ForgetStep.SUCCESS].includes(step);

export const walletUtils = {
  isForgetModalOpen,
};
