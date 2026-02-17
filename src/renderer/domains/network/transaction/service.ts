import { type ApiPromise } from '@polkadot/api';
import { type Call, type DispatchError, type Weight } from '@polkadot/types/interfaces';
import { type SpRuntimeDispatchError } from '@polkadot/types/lookup';
import { type Registry } from '@polkadot/types/types';
import { BN_ZERO, hexToU8a, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, signatureVerify } from '@polkadot/util-crypto';

import { type HexString, type Transaction as DeprecatedTransaction } from '@/shared/core';
import { createTransformer } from '@/shared/di';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ExtrinsicResultParams } from '@/entities/transaction';
import { type AnyAccount } from '../account/types';

import { BlockWeight } from './helpers';
import { type AnyDecodedTransaction, type AnyTransaction, type EncodedTransaction, type Extrinsic } from './types';

const wrapTransactionTransformer = createTransformer<
  AnyTransaction,
  AnyTransaction | Promise<AnyTransaction>,
  { account: AnyAccount; route: AnyAccount[]; api: ApiPromise }
>();

const wrapLegacyTransactionTransformer = createTransformer<
  DeprecatedTransaction,
  DeprecatedTransaction | Promise<DeprecatedTransaction>,
  { account: AnyAccount; route: AnyAccount[]; api: ApiPromise }
>();

const unwrapTransactionTransformer = createTransformer<
  // currect transaction
  AnyDecodedTransaction,
  // child transaction
  AnyTransaction,
  { api: ApiPromise }
>();
const encodeTransactionTransformer = createTransformer<AnyDecodedTransaction, HexString, { api: ApiPromise }>();
const decodeTransactionTransformer = createTransformer<Extrinsic, AnyDecodedTransaction>();

function isEncodedTransaction(transaction: AnyTransaction): transaction is EncodedTransaction {
  return transaction.type === 'encoded';
}

function isDecodedTransaction(transaction: AnyTransaction): transaction is AnyDecodedTransaction {
  return transaction.type === 'decoded';
}

async function wrapTransaction(transaction: AnyTransaction, route: AnyAccount[], api: ApiPromise) {
  let wrapped: AnyTransaction = transaction;

  for (const account of route) {
    const result: AnyTransaction | null = await wrapTransactionTransformer(wrapped, { account, route, api });
    if (nonNullable(result)) {
      wrapped = result;
    }
  }
  return wrapped;
}

/**
 * Wraps transaction with accounts to legacy format.
 *
 * @deprecated
 */
async function wrapLegacyTransaction(transaction: DeprecatedTransaction, route: AnyAccount[], api: ApiPromise) {
  let wrapped: DeprecatedTransaction = transaction;

  for (const account of route) {
    const result: DeprecatedTransaction | null = await wrapLegacyTransactionTransformer(wrapped, {
      account,
      route,
      api,
    });
    if (nonNullable(result)) {
      wrapped = result;
    }
  }
  return wrapped;
}

async function unwrapTransaction(transaction: AnyTransaction, api: ApiPromise) {
  const decoded = decodeTransaction(transaction, api);
  const list = [decoded];
  let last: AnyDecodedTransaction | null = decoded;

  while (nonNullable(last)) {
    const childTransaction = unwrapTransactionTransformer(last, { api });
    if (nonNullable(childTransaction)) {
      last = decodeTransaction(childTransaction, api);
      list.push(last);
    } else {
      last = null;
    }
  }
  return list;
}

function createExtrinsicFromCallData(callData: string, api: ApiPromise): Extrinsic {
  const call = api.registry.createType('Call', callData);
  return api.tx(call);
}

function createExtrinsic(transaction: AnyTransaction, api: ApiPromise): Extrinsic {
  try {
    const encodedExtrinsic = encodeTransaction(transaction, api);
    return createExtrinsicFromCallData(encodedExtrinsic.callData, api);
  } catch (error) {
    try {
      // fail-safe for transactions that are not supported yet. not the best solution, but it works for now.
      return unsafe_createExtrinsicFromAnyTransaction(transaction, api);
    } catch {
      throw error;
    }
  }
}

function unsafe_createExtrinsicFromAnyTransaction(transaction: AnyTransaction, api: ApiPromise): Extrinsic {
  if (isEncodedTransaction(transaction)) {
    return createExtrinsicFromCallData(transaction.callData, api);
  }

  const sectionConstructor = api.tx[transaction.section];
  if (nullable(sectionConstructor)) {
    throw new Error(`Section ${transaction.section} not found in api for chain ${api.genesisHash.toHex()}`);
  }

  const extrinsicConstructor = sectionConstructor[transaction.method];
  if (nullable(extrinsicConstructor)) {
    throw new Error(
      `Method ${transaction.section}.${transaction.method} not found in api for chain ${api.genesisHash.toHex()}`,
    );
  }

  const constructorArguments: unknown[] = [];

  for (const arg of extrinsicConstructor.meta.args) {
    const key = arg.name.toString();
    const value = (transaction.args as Record<string, unknown>)[key];
    if (value === undefined) {
      throw new Error(`Missing argument ${key} for transaction ${transaction.section}.${transaction.method}`);
    }

    constructorArguments.push(api.createType(arg.type.toString(), value));
  }

  return extrinsicConstructor(...constructorArguments);
}

function createEncodedTransactionFromExtrinsic(extrinsic: Extrinsic): EncodedTransaction {
  return {
    type: 'encoded',
    callData: extrinsic.method.toHex(),
  };
}

function encodeTransaction(transaction: AnyTransaction, api: ApiPromise): EncodedTransaction {
  if (isEncodedTransaction(transaction)) {
    return transaction;
  }

  const callData = encodeTransactionTransformer(transaction, { api });
  if (nullable(callData)) {
    const error = new Error(`Serializer for transaction ${transaction.section}.${transaction.method} not found`);
    error.cause = transaction;
    throw error;
  }

  return {
    type: 'encoded',
    callData,
  };
}

function decodeTransaction(transaction: AnyTransaction, api: ApiPromise): AnyDecodedTransaction {
  if (isDecodedTransaction(transaction)) {
    return transaction;
  }

  const decoded = createExtrinsic(transaction, api);
  const result = decodeTransactionTransformer(decoded);
  if (nullable(result)) {
    const error = new Error("Can't decode extrinsic");
    error.cause = transaction;
    throw error;
  }

  return result;
}

async function getExtrinsicFee(extrinsic: Extrinsic) {
  const { partialFee } = await extrinsic.paymentInfo(extrinsic.signer);
  return partialFee.toBn();
}

async function getTransactionFee(transaction: AnyTransaction, signatory: AccountId, api: ApiPromise) {
  const extrinsic = createExtrinsic(transaction, api);
  const { partialFee } = await extrinsic.paymentInfo(signatory);
  return partialFee.toBn();
}

async function getExtrinsicWeight(extrinsic: Extrinsic) {
  const { weight } = await extrinsic.paymentInfo(extrinsic.signer);
  return weight;
}

async function getTransactionWeight(transaction: AnyTransaction, api: ApiPromise) {
  const extrinsic = createExtrinsic(transaction, api);
  return getExtrinsicWeight(extrinsic);
}

function isBatchExtrinsic(extrinsic: Extrinsic) {
  return (
    extrinsic.method.section === 'utility' && ['batchAll', 'batch', 'forceBatch'].includes(extrinsic.method.method)
  );
}

async function getBlockLimit(api: ApiPromise): Promise<BlockWeight> {
  const maxExtrinsicWeight = api.consts.system.blockWeights.perClass.normal.maxExtrinsic.unwrapOrDefault();
  const maxExtrinsic = BlockWeight.fromWeight(maxExtrinsicWeight);

  const maxBlockWeight = api.consts.system.blockWeights.maxBlock;
  const maxBlock = BlockWeight.fromWeight(maxBlockWeight);

  const blockWeight = await api.query.system.blockWeight();

  const usedSpaceInLastBlock = new BlockWeight(
    blockWeight.normal.refTime
      .toBn()
      .add(blockWeight.operational.refTime.toBn())
      .add(blockWeight.mandatory.refTime.toBn()),
    (blockWeight.normal.proofSize?.toBn?.() ?? BN_ZERO)
      .add(blockWeight.operational.proofSize?.toBn?.() ?? BN_ZERO)
      .add(blockWeight.mandatory.proofSize?.toBn?.() ?? BN_ZERO),
  );

  const freeSpaceInLastBlock = new BlockWeight(
    maxBlock.refTime.sub(usedSpaceInLastBlock.refTime),
    maxBlock.proofSize.sub(usedSpaceInLastBlock.proofSize),
  );

  return BlockWeight.takeMinimums(maxExtrinsic.withMargin(), freeSpaceInLastBlock.withMargin());
}

async function splitCallsByWeight(api: ApiPromise, calls: Call[]) {
  const blockLimit = await getBlockLimit(api);
  const result: Extrinsic[][] = [[]];
  let totalWeight = new BlockWeight(BN_ZERO, BN_ZERO);

  const txsWeights: Partial<Record<string, Weight>> = {};

  for (const call of calls) {
    const key = `${call.section}.${call.method}`;
    const extrinsic = api.tx(call);
    const weight = txsWeights[key] || (await getExtrinsicWeight(extrinsic));
    if (!txsWeights[key]) {
      txsWeights[key] = weight;
    }

    const callWeight = BlockWeight.fromWeight(weight);
    const newTotalWeight = totalWeight.add(callWeight);

    if (newTotalWeight.fitsIn(blockLimit) && result.length > 0) {
      const lastBuffer = result.at(-1);
      if (lastBuffer) {
        lastBuffer.push(extrinsic);
      }
      totalWeight = newTotalWeight;
    } else {
      result.push([extrinsic]);
      totalWeight = callWeight;
    }
  }
  return result;
}

async function splitExtrinsic(extrinsic: Extrinsic, api: ApiPromise): Promise<Extrinsic[]> {
  if (isBatchExtrinsic(extrinsic)) {
    const callsArg = extrinsic.args.at(0);
    const calls = (callsArg && Array.isArray(callsArg) ? callsArg : []) as Call[];
    const splitted = await splitCallsByWeight(api, calls);
    const batched = splitted
      .map(e => {
        if (e.length === 0) return null;
        if (e.length === 1) return e.at(0);
        return api.tx.utility.batchAll(e);
      })
      .filter(nonNullable);

    return batched;
  }

  return [extrinsic];
}

function getBatchWrappedCallsFromExtrinsic(extrinsic: Extrinsic): Call[] {
  if (isBatchExtrinsic(extrinsic)) {
    const callsArg = extrinsic.args.at(0);
    const calls = (callsArg && Array.isArray(callsArg) ? callsArg : []) as Call[];

    return calls.flatMap(call => getBatchWrappedCallsFromCall(call));
  }

  return [extrinsic.method as Call];
}

function getBatchWrappedCallsFromCall(call: Call): Call[] {
  if (call.section === 'utility' && ['batchAll', 'batch', 'forceBatch'].includes(call.method)) {
    const callsArg = call.args?.at?.(0) || call.args?.[0];
    const calls = (callsArg && Array.isArray(callsArg) ? callsArg : []) as Call[];

    return calls.flatMap(nestedCall => getBatchWrappedCallsFromCall(nestedCall));
  }

  return [call as Call];
}

const decodeDispatchError = (error: DispatchError | SpRuntimeDispatchError, registry: Registry): string => {
  let errorInfo = error.toString();

  if (error.isModule) {
    const decoded = registry.findMetaError(error.asModule);

    errorInfo = decoded.name
      .split(/(?=[A-Z])/)
      .map(w => w.toLowerCase())
      .join(' ');
  }

  return errorInfo;
};

type SubmitResult =
  | {
      executed: true;
      params: ExtrinsicResultParams;
    }
  | {
      executed: false;
      error: string;
    };

async function submitExtrinsic(
  extrinsic: Extrinsic,
  signature: HexString,
  payload: Uint8Array,
  signatory: AccountId,
  api: ApiPromise,
): Promise<SubmitResult> {
  return new Promise<SubmitResult>(resolve => {
    try {
      console.log('[submitExtrinsic] === REGISTRY DEBUG ===');
      console.log('[submitExtrinsic] signedExtensions:', api.registry.signedExtensions);
      console.log('[submitExtrinsic] getSignedExtensionTypes:', api.registry.getSignedExtensionTypes());
      console.log('[submitExtrinsic] getSignedExtensionExtra:', api.registry.getSignedExtensionExtra());

      // Decode the payload to see what polkadot.js thinks each field is
      const decodedPayload = api.registry.createType('ExtrinsicPayload', payload, { version: extrinsic.version });
      console.log('[submitExtrinsic] === DECODED PAYLOAD FIELDS ===');
      console.log('[submitExtrinsic] decoded method:', decodedPayload.method.toHex());
      console.log('[submitExtrinsic] decoded era:', decodedPayload.era.toHuman());
      console.log('[submitExtrinsic] decoded nonce:', decodedPayload.nonce.toString());
      console.log('[submitExtrinsic] decoded tip:', decodedPayload.tip.toString());
      console.log('[submitExtrinsic] decoded assetId:', (decodedPayload as any).assetId?.toHuman());
      console.log('[submitExtrinsic] decoded mode:', (decodedPayload as any).mode?.toString());
      console.log('[submitExtrinsic] decoded blockHash:', decodedPayload.blockHash.toHex());
      console.log('[submitExtrinsic] decoded genesisHash:', decodedPayload.genesisHash.toHex());
      console.log('[submitExtrinsic] decoded specVersion:', decodedPayload.specVersion.toString());
      console.log('[submitExtrinsic] decoded transactionVersion:', decodedPayload.transactionVersion.toString());
      console.log('[submitExtrinsic] decoded metadataHash:', (decodedPayload as any).metadataHash?.toHex());

      console.log('[submitExtrinsic] === PRE-SUBMIT DEBUG ===');
      console.log('[submitExtrinsic] signatory:', signatory);
      console.log('[submitExtrinsic] signature (hex):', signature);
      console.log('[submitExtrinsic] signature length (bytes):', hexToU8a(signature).length);
      console.log('[submitExtrinsic] payload (hex) [extrinsicPayload.toU8a(false)]:', u8aToHex(payload));
      console.log('[submitExtrinsic] payload length:', payload.length);

      // Reconstruct what Vault signed: strip compact prefix to get [method | extensions]
      const payloadSlice1 = payload.slice(1);
      const payloadSlice2 = payload.slice(2);
      console.log('[submitExtrinsic] payload.slice(1) (method+ext if compact=1byte):', u8aToHex(payloadSlice1));
      console.log('[submitExtrinsic] payload.slice(1) length:', payloadSlice1.length);
      console.log('[submitExtrinsic] payload.slice(2) (method+ext if compact=2byte):', u8aToHex(payloadSlice2));
      console.log('[submitExtrinsic] payload.slice(2) length:', payloadSlice2.length);

      // What ExtrinsicPayload.sign() would sign: toU8a({ method: true })
      // Reconstruct ExtrinsicPayload from the raw bytes to get the "signing" form
      const reconstructedPayload = api.registry.createType('ExtrinsicPayload', payload, { version: extrinsic.version });
      const signingBytes = reconstructedPayload.toU8a({ method: true });
      const signingBytesHashed = signingBytes.length > 256 ? blake2AsU8a(signingBytes) : signingBytes;
      console.log('[submitExtrinsic] reconstructed ExtrinsicPayload.toU8a({method:true}):', u8aToHex(signingBytes));
      console.log('[submitExtrinsic] signingBytes length:', signingBytes.length);
      console.log('[submitExtrinsic] signingBytes would be hashed:', signingBytes.length > 256);
      console.log('[submitExtrinsic] signingBytes (after hash if needed):', u8aToHex(signingBytesHashed));

      // Vault hashing: > 257 threshold
      const vaultHash1 = payloadSlice1.length > 257 ? blake2AsU8a(payloadSlice1) : payloadSlice1;
      const vaultHash2 = payloadSlice2.length > 257 ? blake2AsU8a(payloadSlice2) : payloadSlice2;
      console.log('[submitExtrinsic] vaultHash1:', u8aToHex(vaultHash1));
      console.log('[submitExtrinsic] vaultHash2:', u8aToHex(vaultHash2));

      // Verify signature against all candidates
      try {
        const verify1Raw = signatureVerify(payloadSlice1, signature, signatory);
        console.log('[submitExtrinsic] verify(slice1 raw):', verify1Raw.isValid);
      } catch (e) {
        console.log('[submitExtrinsic] verify(slice1 raw) error:', e);
      }
      try {
        const verify1Hashed = signatureVerify(
          payloadSlice1.length > 256 ? blake2AsU8a(payloadSlice1) : payloadSlice1,
          signature,
          signatory,
        );
        console.log('[submitExtrinsic] verify(slice1, chain threshold >256):', verify1Hashed.isValid);
      } catch (e) {
        console.log('[submitExtrinsic] verify(slice1, chain threshold) error:', e);
      }
      try {
        const verify2Raw = signatureVerify(payloadSlice2, signature, signatory);
        console.log('[submitExtrinsic] verify(slice2 raw):', verify2Raw.isValid);
      } catch (e) {
        console.log('[submitExtrinsic] verify(slice2 raw) error:', e);
      }
      try {
        const verify2Hashed = signatureVerify(
          payloadSlice2.length > 256 ? blake2AsU8a(payloadSlice2) : payloadSlice2,
          signature,
          signatory,
        );
        console.log('[submitExtrinsic] verify(slice2, chain threshold >256):', verify2Hashed.isValid);
      } catch (e) {
        console.log('[submitExtrinsic] verify(slice2, chain threshold) error:', e);
      }
      try {
        const verifySigningBytes = signatureVerify(signingBytesHashed, signature, signatory);
        console.log('[submitExtrinsic] verify(reconstructed signingBytes):', verifySigningBytes.isValid);
      } catch (e) {
        console.log('[submitExtrinsic] verify(reconstructed signingBytes) error:', e);
      }

      // Compare bytes to find mismatch
      console.log('[submitExtrinsic] === BYTE COMPARISON ===');
      console.log('[submitExtrinsic] slice1 === signingBytes:', u8aToHex(payloadSlice1) === u8aToHex(signingBytes));
      console.log('[submitExtrinsic] slice2 === signingBytes:', u8aToHex(payloadSlice2) === u8aToHex(signingBytes));

      extrinsic.addSignature(signatory, hexToU8a(signature), payload);

      console.log('[submitExtrinsic] === POST-addSignature ===');
      console.log('[submitExtrinsic] signed extrinsic hex:', extrinsic.toHex());
      console.log('[submitExtrinsic] signed extrinsic human:', extrinsic.toHuman());

      extrinsic
        .send(result => {
          const { status, events, txHash, txIndex, blockNumber, dispatchError, internalError } = result as any;

          const actualTxHash = txHash.toHex();
          const extrinsicIndex = txIndex;
          let isFinalApprove = false;
          let multisigError = '';

          if (internalError) {
            resolve({
              executed: false,
              error: internalError.message,
            });
            return;
          }

          if (dispatchError) {
            resolve({
              executed: false,
              error: decodeDispatchError(dispatchError, extrinsic.registry),
            });
            return;
          }

          if (status.isInvalid) {
            resolve({
              executed: false,
              error: 'Invalid transaction',
            });
          }

          if (status.isInBlock) {
            for (const { event, phase } of events) {
              if (!phase.isApplyExtrinsic || !phase.asApplyExtrinsic.eq(txIndex)) continue;

              if (api.events.multisig.MultisigExecuted.is(event)) {
                isFinalApprove = true;
                multisigError = event.data[4].isErr ? decodeDispatchError(event.data[4].asErr, extrinsic.registry) : '';
              }

              if (api.events.system.ExtrinsicSuccess.is(event)) {
                resolve({
                  executed: true,
                  params: {
                    timepoint: {
                      index: extrinsicIndex,
                      height: blockNumber.toNumber(),
                    },
                    signature,
                    extrinsicHash: actualTxHash,
                    isFinalApprove,
                    multisigError,
                  },
                });
              }
            }
          }
        })
        .catch(error => {
          resolve({
            executed: false,
            error: (error as Error).message || 'Transaction submission failed',
          });
        });
    } catch (error) {
      resolve({
        executed: false,
        error: (error as Error).message || 'Failed to prepare transaction',
      });
    }
  });
}

export const transactionService = {
  wrapTransactionTransformer,
  wrapLegacyTransactionTransformer,
  unwrapTransactionTransformer,
  encodeTransactionTransformer,
  decodeTransactionTransformer,

  isEncodedTransaction,
  isDecodedTransaction,

  isBatchExtrinsic,

  wrapTransaction,
  wrapLegacyTransaction,
  unwrapTransaction,
  encodeTransaction,
  decodeTransaction,

  unsafe_createExtrinsicFromAnyTransaction,
  createEncodedTransactionFromExtrinsic,
  createExtrinsicFromCallData,
  createExtrinsic,

  getExtrinsicFee,
  getTransactionFee,
  getExtrinsicWeight,
  getTransactionWeight,

  getBatchWrappedCallsFromExtrinsic,
  getBatchWrappedCallsFromCall,

  splitExtrinsic,
  submitExtrinsic,
};
