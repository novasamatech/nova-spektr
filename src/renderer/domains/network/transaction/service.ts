import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';

import { type Chain } from '@/shared/core';
import { createPipeline, createTransformer } from '@/shared/di';
import { nullable } from '@/shared/lib/utils';
import { type AnyAccount } from '../account/types';

import { type AnyDecodedTransaction, type AnyTransaction, type EncodedTransaction } from './types';

const wrapTransactionPipeline = createPipeline<EncodedTransaction, { account: AnyAccount; chain: Chain }>();
const encodeTransactionTransformer = createTransformer<
  AnyDecodedTransaction,
  EncodedTransaction,
  { api: ApiPromise }
>();
const decodeTransactionTransformer = createTransformer<SubmittableExtrinsic<'promise'>, AnyDecodedTransaction>();

function isEncodedTransaction(transaction: AnyTransaction): transaction is EncodedTransaction {
  return transaction.type === 'encoded';
}

function isDecodedTransaction(transaction: AnyTransaction): transaction is AnyDecodedTransaction {
  return transaction.type === 'decoded';
}

function wrapTransaction(transaction: EncodedTransaction, route: AnyAccount[], chain: Chain) {
  let wrapped = transaction;
  for (const account of Array.from(route).reverse()) {
    wrapped = wrapTransactionPipeline(wrapped, { account, chain });
  }
  return wrapped;
}

function encodeTransaction(transaction: AnyTransaction, api: ApiPromise): EncodedTransaction {
  if (isEncodedTransaction(transaction)) {
    return transaction;
  }

  const result = encodeTransactionTransformer(transaction, { api });
  if (nullable(result)) {
    const error = new Error(`Serializer for transaction ${transaction.section}.${transaction.method} not found`);
    error.cause = transaction;
    throw error;
  }

  return result;
}

function decodeTransaction(transaction: AnyTransaction, api: ApiPromise): AnyDecodedTransaction {
  if (isDecodedTransaction(transaction)) {
    return transaction;
  }

  let decoded: SubmittableExtrinsic<'promise'> | null = null;

  try {
    decoded = api.tx(transaction.callData);
  } catch {
    const extrinsicCall = api.createType('Call', transaction.callData);
    const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex);

    const apiSection = api.tx[section];
    if (!apiSection) throw new Error(`Section ${section} not found in api for chain ${api.genesisHash.toHex()}`);

    const extrinsicFn = apiSection[method];
    if (!extrinsicFn)
      throw new Error(`Method ${section}.${method} not found in api for chain ${api.genesisHash.toHex()}`);

    decoded = extrinsicFn(...extrinsicCall.args);
  }

  const result = decodeTransactionTransformer(decoded);
  if (nullable(result)) {
    const error = new Error("Can't decode extrinsic");
    error.cause = transaction;
    throw error;
  }

  return result;
}

export const transactionService = {
  wrapTransactionPipeline,
  encodeTransactionTransformer,
  decodeTransactionTransformer,

  isEncodedTransaction,
  isDecodedTransaction,

  wrapTransaction,
  encodeTransaction,
  decodeTransaction,
};
