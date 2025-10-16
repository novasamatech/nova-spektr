import { type ApiPromise } from '@polkadot/api';
import { type Call, type DispatchError, type Weight } from '@polkadot/types/interfaces';
import { type SpRuntimeDispatchError } from '@polkadot/types/lookup';
import { type Registry } from '@polkadot/types/types';
import { BN, BN_ZERO, hexToU8a } from '@polkadot/util';

import { type Transaction as DeprecatedTransaction, type HexString } from '@/shared/core';
import { createTransformer } from '@/shared/di';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ExtrinsicResultParams } from '@/entities/transaction';
import { type AnyAccount } from '../account/types';

import { LEAVE_SOME_SPACE_MULTIPLIER } from './constants';
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

async function getTransactionFee(transaction: AnyTransaction, api: ApiPromise) {
  const extrinsic = createExtrinsic(transaction, api);
  const { partialFee } = await extrinsic.paymentInfo(extrinsic.signer);
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

async function getBlockLimit(api: ApiPromise): Promise<BN> {
  const maxExtrinsicWeight = api.consts.system.blockWeights.perClass.normal.maxExtrinsic.value.refTime.toBn();
  const maxBlockWeight = api.consts.system.blockWeights.maxBlock.refTime.toBn();
  const blockWeight = await api.query.system.blockWeight();

  const totalWeight = blockWeight.normal.refTime
    .toBn()
    .add(blockWeight.operational.refTime.toBn())
    .add(blockWeight.mandatory.refTime.toBn());

  const freeSpaceInLastBlock = maxBlockWeight.sub(totalWeight);

  return BN.min(
    maxExtrinsicWeight.muln(LEAVE_SOME_SPACE_MULTIPLIER),
    freeSpaceInLastBlock.muln(LEAVE_SOME_SPACE_MULTIPLIER),
  );
}

async function splitCallsByWeight(api: ApiPromise, calls: Call[]) {
  const blockLimit = await getBlockLimit(api);
  const result: Extrinsic[][] = [[]];

  let totalRefTime = BN_ZERO;

  const txsWeights: Partial<Record<string, Weight>> = {};

  for (const call of calls) {
    const key = `${call.section}.${call.method}`;
    const extrinsic = api.tx(call);
    const weight = txsWeights[key] || (await getExtrinsicWeight(extrinsic));

    if (!txsWeights[key]) {
      txsWeights[key] = weight;
    }

    totalRefTime = totalRefTime.add(weight.refTime.toBn());

    if (totalRefTime.lt(blockLimit) && result.length > 0) {
      const lastBuffer = result.at(-1);
      if (lastBuffer) {
        lastBuffer.push(extrinsic);
      }
    } else {
      result.push([extrinsic]);

      totalRefTime = weight.refTime.toBn();
    }
  }

  return result;
}

async function splitExtrinsic(extrinsic: Extrinsic, api: ApiPromise): Promise<Extrinsic[]> {
  if (isBatchExtrinsic(extrinsic)) {
    // @ts-expect-error calls arg is Vec<Call>
    const splitted = await splitCallsByWeight(api, extrinsic.args.at(0) ?? []);
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
      extrinsic.addSignature(signatory, hexToU8a(signature), payload);
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

          if (status.isFuture) {
            resolve({
              executed: false,
              error: 'Invalid transaction: queued for future (nonce too high)',
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
            error: (error as Error).message || 'Error',
          });
        });
    } catch (error) {
      resolve({
        executed: false,
        error: (error as Error).message || 'Error',
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

  splitExtrinsic,
  submitExtrinsic,
};
