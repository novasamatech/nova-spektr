import { ReconnectStep } from './constants';

export const isReconnectingStep = (step: ReconnectStep) => step === ReconnectStep.RECONNECTING;
export const isConnectedStep = (step: ReconnectStep) => step === ReconnectStep.SUCCESS;
export const isRejectedStep = (step: ReconnectStep) => step === ReconnectStep.REJECTED;
export const isReadyToReconnectStep = (step: ReconnectStep) => step === ReconnectStep.READY_TO_RECONNECT;
