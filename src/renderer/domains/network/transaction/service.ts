import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';

import { type HexString } from '@/shared/core';
import { createTransformer } from '@/shared/di';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AnyAccount } from '../account/types';

import { type AnyDecodedTransaction, type AnyTransaction, type EncodedTransaction } from './types';

const wrapTransactionTransformer = createTransformer<
  AnyTransaction,
  AnyTransaction | Promise<AnyTransaction>,
  { account: AnyAccount; api: ApiPromise }
>();

const unwrapTransactionTransformer = createTransformer<
  // currect transaction
  AnyDecodedTransaction,
  // child transaction
  AnyTransaction,
  { api: ApiPromise }
>();
const encodeTransactionTransformer = createTransformer<AnyDecodedTransaction, HexString, { api: ApiPromise }>();
const decodeTransactionTransformer = createTransformer<SubmittableExtrinsic<'promise'>, AnyDecodedTransaction>();

function isEncodedTransaction(transaction: AnyTransaction): transaction is EncodedTransaction {
  return transaction.type === 'encoded';
}

function isDecodedTransaction(transaction: AnyTransaction): transaction is AnyDecodedTransaction {
  return transaction.type === 'decoded';
}

async function wrapTransaction(transaction: EncodedTransaction, route: AnyAccount[], api: ApiPromise) {
  let wrapped: AnyTransaction = transaction;
  for (const account of Array.from(route).reverse()) {
    const result: AnyTransaction | null = await wrapTransactionTransformer(wrapped, { account, api });
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

function createSubmittableExtrinsic(transaction: AnyTransaction, api: ApiPromise): SubmittableExtrinsic<'promise'> {
  const encodedExtrinsic = encodeTransaction(transaction, api);

  try {
    return api.tx(encodedExtrinsic.callData);
  } catch {
    const extrinsicCall = api.createType('Call', encodedExtrinsic.callData);
    const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex);

    const apiSection = api.tx[section];
    if (!apiSection) throw new Error(`Section ${section} not found in api for chain ${api.genesisHash.toHex()}`);

    const extrinsicFn = apiSection[method];
    if (!extrinsicFn)
      throw new Error(`Method ${section}.${method} not found in api for chain ${api.genesisHash.toHex()}`);

    return extrinsicFn(...extrinsicCall.args);
  }
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

async function getExtrinsicFee(extrinsic: SubmittableExtrinsic<'promise'>) {
  const { partialFee } = await extrinsic.paymentInfo(extrinsic.signer);
  return partialFee.toBn();
}

async function getExtrinsicWeight(extrinsic: SubmittableExtrinsic<'promise'>) {
  const { weight } = await extrinsic.paymentInfo(extrinsic.signer);
  return weight;
}

export const transactionService = {
  wrapTransactionTransformer,
  unwrapTransactionTransformer,
  encodeTransactionTransformer,
  decodeTransactionTransformer,

  isEncodedTransaction,
  isDecodedTransaction,

  wrapTransaction,
  unwrapTransaction,
  encodeTransaction,
  decodeTransaction,

  createSubmittableExtrinsic,

  getExtrinsicFee,
  getExtrinsicWeight,
};
