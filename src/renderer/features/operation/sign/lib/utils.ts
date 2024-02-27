import { SessionTypes } from '@walletconnect/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';

import { ReconnectStep } from './constants';
import { HexString } from '@shared/core';

export const isReconnectingStep = (step: ReconnectStep): boolean => step === ReconnectStep.RECONNECTING;
export const isConnectedStep = (step: ReconnectStep): boolean => step === ReconnectStep.SUCCESS;
export const isRejectedStep = (step: ReconnectStep): boolean => step === ReconnectStep.REJECTED;
export const isReadyToReconnectStep = (step: ReconnectStep): boolean => step === ReconnectStep.READY_TO_RECONNECT;

export const isTopicExists = (session?: SessionTypes.Struct | null): boolean => Boolean(session?.topic);

const ECDSA_SIGNATURE_LENGTH = 66;

export const transformEcdsaSignature = (signature: HexString): HexString => {
  const u8aSignature = hexToU8a(signature);

  return u8aToHex(u8aSignature.length === ECDSA_SIGNATURE_LENGTH ? u8aSignature.subarray(1) : u8aSignature);
};
