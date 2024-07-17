import { type SessionTypes } from '@walletconnect/types';
import { hexToU8a, u8aToHex } from '@polkadot/util';

import { type HexString } from '@shared/core';
import { ReconnectStep } from './types';

export const operationSignUtils = {
  isReconnectingStep,
  isConnectedStep,
  isRejectedStep,
  isReadyToReconnectStep,
  isTopicExist,
  transformEcdsaSignature,
};

function isReconnectingStep(step: ReconnectStep): boolean {
  return step === ReconnectStep.RECONNECTING;
}

function isConnectedStep(step: ReconnectStep): boolean {
  return step === ReconnectStep.SUCCESS;
}

function isRejectedStep(step: ReconnectStep): boolean {
  return step === ReconnectStep.REJECTED;
}

function isReadyToReconnectStep(step: ReconnectStep): boolean {
  return step === ReconnectStep.READY_TO_RECONNECT;
}

function isTopicExist(session?: SessionTypes.Struct | null): boolean {
  return Boolean(session?.topic);
}

const ECDSA_SIGNATURE_LENGTH = 66;

function transformEcdsaSignature(signature: HexString): HexString {
  const u8aSignature = hexToU8a(signature);

  return u8aToHex(u8aSignature.length === ECDSA_SIGNATURE_LENGTH ? u8aSignature.subarray(1) : u8aSignature);
}
