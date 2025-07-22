import { type ApiPromise } from '@polkadot/api';
import { type Call, type Weight } from '@polkadot/types/interfaces';
import { BN, BN_ZERO } from '@polkadot/util';

import { type Transaction as DeprecatedTransaction, type HexString } from '@/shared/core';
import { createTransformer } from '@/shared/di';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AnyAccount } from '../account/types';

import { LEAVE_SOME_SPACE_MULTIPLIER } from './constants';
import { type AnyDecodedTransaction, type AnyTransaction, type EncodedTransaction, type Extrinsic } from './types';

const wrapTransactionTransformer = createTransformer<
  AnyTransaction,
  AnyTransaction | Promise<AnyTransaction>,
  { account: AnyAccount; route: AnyAccount[]; index: number; api: ApiPromise }
>();

const wrapLegacyTransactionTransformer = createTransformer<
  DeprecatedTransaction,
  DeprecatedTransaction | Promise<DeprecatedTransaction>,
  { account: AnyAccount; route: AnyAccount[]; index: number; api: ApiPromise }
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

async function wrapTransaction(transaction: EncodedTransaction, route: AnyAccount[], api: ApiPromise) {
  let wrapped: AnyTransaction = transaction;

  for (const [index, account] of Array.from(route).entries()) {
    const result: AnyTransaction | null = await wrapTransactionTransformer(wrapped, { account, route, index, api });
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

  for (const [index, account] of Array.from(route).entries()) {
    const result: DeprecatedTransaction | null = await wrapLegacyTransactionTransformer(wrapped, {
      account,
      route,
      index,
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

function createSubmittableExtrinsicFromCallData(callData: string, api: ApiPromise): Extrinsic {
  try {
    return api.tx(callData);
  } catch {
    const extrinsicCall = api.createType('Call', callData);
    const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex);

    const apiSection = api.tx[section];
    if (!apiSection) throw new Error(`Section ${section} not found in api for chain ${api.genesisHash.toHex()}`);

    const extrinsicFn = apiSection[method];
    if (!extrinsicFn)
      throw new Error(`Method ${section}.${method} not found in api for chain ${api.genesisHash.toHex()}`);

    return extrinsicFn(...extrinsicCall.args);
  }
}

function createSubmittableExtrinsic(transaction: AnyTransaction, api: ApiPromise): Extrinsic {
  const encodedExtrinsic = encodeTransaction(transaction, api);
  return createSubmittableExtrinsicFromCallData(encodedExtrinsic.callData, api);
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

  const decoded = createSubmittableExtrinsic(transaction, api);
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

async function getExtrinsicWeight(extrinsic: Extrinsic) {
  const { weight } = await extrinsic.paymentInfo(extrinsic.signer);
  return weight;
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

  createSubmittableExtrinsicFromCallData,
  createSubmittableExtrinsic,

  getExtrinsicFee,
  getExtrinsicWeight,

  splitExtrinsic,
};
