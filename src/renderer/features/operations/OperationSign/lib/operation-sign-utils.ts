import { compactFromU8a, hexToU8a, u8aToHex } from '@polkadot/util';
import { type SessionTypes } from '@walletconnect/types';

import { type HexString } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { transactionService } from '@/entities/transaction';

import { ReconnectStep } from './types';

export const operationSignUtils = {
  isReconnectingStep,
  isConnectedStep,
  isRejectedStep,
  isFailedStep,
  isReadyToReconnectStep,
  isTopicExist,
  transformEcdsaSignature,
  getSignedBytes,
  verifySignatures,
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

function isFailedStep(step: ReconnectStep): boolean {
  return step === ReconnectStep.FAILED;
}

function isTopicExist(session?: SessionTypes.Struct | null): boolean {
  return Boolean(session?.topic);
}

const ECDSA_SIGNATURE_LENGTH = 66;

function transformEcdsaSignature(signature: HexString): HexString {
  const u8aSignature = hexToU8a(signature);

  return u8aToHex(u8aSignature.length === ECDSA_SIGNATURE_LENGTH ? u8aSignature.subarray(1) : u8aSignature);
}

/**
 * Bytes a signer actually signs for an encoded `ExtrinsicPayload`: the same
 * payload with `method` inlined, i.e. without its compact length prefix
 * (`ExtrinsicPayload.toU8a({ method: true })`).
 */
function getSignedBytes(payload: Uint8Array): Uint8Array {
  const [prefixLength] = compactFromU8a(payload);

  return payload.subarray(prefixLength);
}

type VerifySignaturesParams = {
  /** Encoded `ExtrinsicPayload`s, as passed on to `onResult`. */
  payloads: Uint8Array[];
  signatures: HexString[];
  /** Expected signer of each payload, index-aligned with `payloads`. */
  accountIds: AccountId[];
};

/**
 * Checks that every signature was produced by its own account over its own
 * payload. Fails when the counts differ or nothing was signed.
 */
function verifySignatures({ payloads, signatures, accountIds }: VerifySignaturesParams): boolean {
  if (signatures.length === 0 || signatures.length !== payloads.length || signatures.length !== accountIds.length) {
    return false;
  }

  return signatures.every((signature, index) => {
    const payload = payloads[index];
    const accountId = accountIds[index];

    if (!payload || !accountId) return false;

    return transactionService.verifySignature(getSignedBytes(payload), signature, accountId);
  });
}
