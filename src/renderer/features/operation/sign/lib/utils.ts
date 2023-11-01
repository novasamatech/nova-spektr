import { SessionTypes } from '@walletconnect/types';

import { ReconnectStep } from './constants';

export const isReconnectingStep = (step: ReconnectStep): boolean => step === ReconnectStep.RECONNECTING;
export const isConnectedStep = (step: ReconnectStep): boolean => step === ReconnectStep.SUCCESS;
export const isRejectedStep = (step: ReconnectStep): boolean => step === ReconnectStep.REJECTED;
export const isReadyToReconnectStep = (step: ReconnectStep): boolean => step === ReconnectStep.READY_TO_RECONNECT;

export const isTopicExists = (session?: SessionTypes.Struct | null): boolean => Boolean(session?.topic);
