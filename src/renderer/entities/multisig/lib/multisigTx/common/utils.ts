import { type ApiPromise } from '@polkadot/api';
import { type Vec } from '@polkadot/types';
import { type AccountId32 } from '@polkadot/types/interfaces';

import {
  type Address,
  type ChainId,
  type DecodedTransaction,
  type MultisigAccount,
  type MultisigEvent,
  type MultisigTransaction,
  type Transaction,
} from '@/shared/core';
import { MultisigTxInitStatus, TransactionType } from '@/shared/core';
import { getCreatedDate, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ExtrinsicResultParams, findCoreBatchAll } from '@/entities/transaction';

import { type PendingMultisigTransaction } from './types';

type MultisigTxResult = {
  transaction: MultisigTransaction;
  event: MultisigEvent;
};

export const getPendingMultisigTxs = async (
  api: ApiPromise,
  address: Address,
): Promise<PendingMultisigTransaction[]> => {
  const multisigs = await api.query.multisig.multisigs.entries(address);

  return multisigs
    .filter(([, opt]) => opt.isSome)
    .reduce<PendingMultisigTransaction[]>((acc, [storage, opt]) => {
      if (opt.isNone) return acc;

      const params = opt.unwrap();
      const [, callHash] = storage.args;

      return [...acc, { callHash, params }];
    }, []);
};

export const updateOldEventsPayload = (events: MultisigEvent[], approvals: Vec<AccountId32>): MultisigEvent[] => {
  return events.map((e) => {
    const isPendingSigned = e.status === 'PENDING_SIGNED';
    const hasApproval = approvals.find((a) => a.toHex() === e.accountId);

    if (!isPendingSigned || !hasApproval) return e;

    return { ...e, status: 'SIGNED' };
  });
};

export const createNewEventsPayload = (
  events: MultisigEvent[],
  tx: MultisigTransaction,
  approvals: Vec<AccountId32>,
): MultisigEvent[] => {
  return approvals.reduce<MultisigEvent[]>((acc, a) => {
    const hasApprovalEvent = events.find((e) => e.status === 'SIGNED' && e.accountId === a.toHex());

    if (!hasApprovalEvent) {
      acc.push({
        txAccountId: tx.accountId,
        txChainId: tx.chainId,
        txCallHash: tx.callHash,
        txBlock: tx.blockCreated,
        txIndex: tx.indexCreated,
        status: 'SIGNED',
        accountId: a.toHex() as AccountId,
        dateCreated: Date.now(),
      });
    }

    return acc;
  }, []);
};

export const updateTransactionPayload = (
  transaction: MultisigTransaction,
  pendingTransaction: PendingMultisigTransaction,
): MultisigTransaction | undefined => {
  const { when, deposit, depositor } = pendingTransaction.params;

  const blockCreated = when.height.toNumber();
  const indexCreated = when.index.toNumber();

  if (
    transaction.blockCreated === blockCreated &&
    transaction.indexCreated === indexCreated &&
    transaction.deposit === deposit.toString() &&
    transaction.depositor === depositor.toHex()
  )
    return;

  return {
    ...transaction,
    blockCreated,
    indexCreated,
    deposit: deposit.toString(),
    depositor: depositor.toHex() as AccountId,
  };
};

export const createEventsPayload = (
  tx: MultisigTransaction,
  pendingTransaction: PendingMultisigTransaction,
  account: MultisigAccount,
  currentBlock: number,
  blockTime: number,
): MultisigEvent[] => {
  const { when, approvals, depositor } = pendingTransaction.params;

  const dateCreated = getCreatedDate(when.height.toNumber(), currentBlock, blockTime);

  return approvals.map((a) => ({
    txAccountId: tx.accountId,
    txChainId: tx.chainId,
    txCallHash: tx.callHash,
    txBlock: tx.blockCreated,
    txIndex: tx.indexCreated,
    status: 'SIGNED',
    accountId: account.signatories.find((s) => s.accountId === a.toHuman())?.accountId || (a.toHex() as AccountId),
    dateCreated: a.toHex() === depositor.toHex() ? dateCreated : undefined,
  }));
};

export const createTransactionPayload = (
  pendingTransaction: PendingMultisigTransaction,
  chainId: ChainId,
  account: MultisigAccount,
  currentBlock: number,
  blockTime: number,
): MultisigTransaction => {
  const { when, deposit, depositor } = pendingTransaction.params;

  const dateCreated = getCreatedDate(when.height.toNumber(), currentBlock, blockTime);

  return {
    chainId,
    dateCreated,
    blockCreated: when.height.toNumber(),
    indexCreated: when.index.toNumber(),
    status: MultisigTxInitStatus.SIGNING,
    callHash: pendingTransaction.callHash.toHex(),
    signatories: account.signatories,
    deposit: deposit.toString(),
    depositor: depositor.toHex() as AccountId,
    accountId: account.accountId || '0x',
  };
};

export const buildMultisigTx = (
  tx: Transaction,
  multisigTx: Transaction,
  params: ExtrinsicResultParams,
  account: MultisigAccount,
): MultisigTxResult => {
  const transaction: MultisigTransaction = {
    transaction: tx,
    accountId: account.accountId,
    chainId: multisigTx.chainId,
    signatories: account.signatories,
    callData: multisigTx.args.callData,
    callHash: multisigTx.args.callHash,
    status: MultisigTxInitStatus.SIGNING,
    blockCreated: params.timepoint.height,
    indexCreated: params.timepoint.index,
    dateCreated: Date.now(),
  };

  const event: MultisigEvent = {
    txAccountId: transaction.accountId,
    txChainId: transaction.chainId,
    txCallHash: transaction.callHash,
    txBlock: transaction.blockCreated,
    txIndex: transaction.indexCreated,
    accountId: toAccountId(multisigTx.address),
    extrinsicHash: params.extrinsicHash,
    eventBlock: params.timepoint.height,
    eventIndex: params.timepoint.index,
    dateCreated: Date.now(),
    status: 'SIGNED',
  };

  return { event, transaction };
};

export const getTransactionFromMultisigTx = (tx: MultisigTransaction): Transaction | DecodedTransaction | undefined => {
  const NestedTransactionTypes = [TransactionType.BATCH_ALL, TransactionType.PROXY];

  // @ts-expect-error TODO fix
  if (!tx.transaction || !NestedTransactionTypes.includes(tx.transaction.type)) {
    return tx.transaction;
  }

  const transactionMatch = findCoreBatchAll(tx.transaction);

  return transactionMatch || tx.transaction.args.transactions?.[0] || tx.transaction.args.transaction;
};
