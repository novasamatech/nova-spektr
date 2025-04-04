import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';

import { type HexString } from '@/shared/core';
import { createTransformer } from '@/shared/di';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AnyAccount } from '../account/types';

import {
  type AnyDecodedTransaction,
  type AnyTransaction,
  type BatchTransaction,
  type EncodedTransaction,
} from './types';

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
const decodeTransactionTransformer = createTransformer<
  SubmittableExtrinsic<'promise'>,
  AnyDecodedTransaction,
  { api: ApiPromise }
>();

function isEncodedTransaction(transaction: AnyTransaction): transaction is EncodedTransaction {
  return transaction.type === 'encoded';
}

function isDecodedTransaction(transaction: AnyTransaction): transaction is AnyDecodedTransaction {
  return transaction.type === 'decoded';
}

function isBatchTransaction(transaction: AnyTransaction): transaction is BatchTransaction {
  return (
    isDecodedTransaction(transaction) &&
    transaction.section === 'utility' &&
    ['batchAll', 'batch', 'forceBatch'].includes(transaction.method)
  );
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

function unwrapTransaction(transaction: AnyTransaction, api: ApiPromise) {
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
  const encodedTransaction = encodeTransaction(transaction, api);

  try {
    return api.tx(encodedTransaction.callData);
  } catch {
    const extrinsicCall = api.createType('Call', encodedTransaction.callData);
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

  // Batched extrinsics are supported out of the box.
  if (transaction.section === 'utility' && ['batchAll', 'batch', 'forceBatch'].includes(transaction.method)) {
    const calls = (transaction as BatchTransaction).args.calls.map(c => encodeTransaction(c, api).callData);
    const method = api.tx.utility[transaction.method];

    if (!method) {
      throw new Error(`Batch method ${transaction.method} not found!`);
    }

    return {
      type: 'encoded',
      callData: method(calls).method.toHex(),
    };
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

function decodeExtrinsic(extrinsic: SubmittableExtrinsic<'promise'>, api: ApiPromise): AnyDecodedTransaction {
  // Batched extrinsics are supported out of the box.
  const { section, method } = extrinsic.method;
  if (section === 'utility' && ['batchAll', 'batch', 'forceBatch'].includes(method)) {
    const callsArg = extrinsic.args[0]?.toHex();
    if (callsArg) {
      const calls = api.createType('Vec<Call>', callsArg);
      const batchedTransactions = calls.map(call => {
        return decodeTransaction({ type: 'encoded', callData: call.toHex() }, api);
      });

      return {
        type: 'decoded',
        section,
        method,
        args: { calls: batchedTransactions },
      } satisfies BatchTransaction;
    }
  }

  const result = decodeTransactionTransformer(extrinsic, { api });
  if (nullable(result)) {
    const error = new Error("Can't decode extrinsic");
    error.cause = extrinsic;
    throw error;
  }

  return result;
}

function decodeTransaction(transaction: AnyTransaction, api: ApiPromise): AnyDecodedTransaction {
  if (isDecodedTransaction(transaction)) {
    return transaction;
  }

  const extrinsic = createSubmittableExtrinsic(transaction, api);
  return decodeExtrinsic(extrinsic, api);
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
  isBatchTransaction,

  wrapTransaction,
  unwrapTransaction,
  encodeTransaction,
  decodeTransaction,
  decodeExtrinsic,

  createSubmittableExtrinsic,

  getExtrinsicFee,
  getExtrinsicWeight,
};
