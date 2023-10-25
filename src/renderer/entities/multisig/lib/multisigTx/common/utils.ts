import { ApiPromise } from '@polkadot/api';
import { Vec } from '@polkadot/types';
import { AccountId32 } from '@polkadot/types/interfaces';

import { PendingMultisigTransaction } from './types';
import { getCreatedDate, toAccountId } from '@renderer/shared/lib/utils';
import { DecodedTransaction, ExtrinsicResultParams, TransactionType } from '@renderer/entities/transaction';
import type { MultisigAccount, Address, ChainId } from '@renderer/shared/core';
import {
  MultisigEvent,
  MultisigTransaction,
  MultisigTxInitStatus,
  Transaction,
} from '@renderer/entities/transaction/model/transaction';

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
        accountId: a.toHex(),
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
  ) {
    return;
  }

  return {
    ...transaction,
    blockCreated,
    indexCreated,
    deposit: deposit.toString(),
    depositor: depositor.toHex(),
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

  const events: MultisigEvent[] = approvals.map((a) => ({
    txAccountId: tx.accountId,
    txChainId: tx.chainId,
    txCallHash: tx.callHash,
    txBlock: tx.blockCreated,
    txIndex: tx.indexCreated,
    status: 'SIGNED',
    accountId: account.signatories.find((s) => s.accountId === a.toHuman())?.accountId || a.toHex(),
    dateCreated: a.toHex() === depositor.toHex() ? dateCreated : undefined,
  }));

  return events;
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
    depositor: depositor.toHex(),
    accountId: account.accountId || '0x',
  };
};

export const buildMultisigTx = (
  tx: Transaction,
  multisigTx: Transaction,
  params: ExtrinsicResultParams,
  account: MultisigAccount,
  description?: string,
): MultisigTxResult => {
  const transaction: MultisigTransaction = {
    accountId: account.accountId,
    chainId: multisigTx.chainId,
    signatories: account.signatories,
    callData: multisigTx.args.callData,
    callHash: multisigTx.args.callHash,
    transaction: tx,
    status: MultisigTxInitStatus.SIGNING,
    blockCreated: params.timepoint.height,
    indexCreated: params.timepoint.index,
    description,
    dateCreated: Date.now(),
  };

  const event: MultisigEvent = {
    txAccountId: transaction.accountId,
    txChainId: transaction.chainId,
    txCallHash: transaction.callHash,
    txBlock: transaction.blockCreated,
    txIndex: transaction.indexCreated,
    status: 'SIGNED',
    accountId: toAccountId(multisigTx.address),
    extrinsicHash: params.extrinsicHash,
    eventBlock: params.timepoint.height,
    eventIndex: params.timepoint.index,
    dateCreated: Date.now(),
  };

  return {
    event,
    transaction,
  };
};

export const getTransactionFromMultisigTx = (tx: MultisigTransaction): Transaction | DecodedTransaction | undefined => {
  if (!tx.transaction || tx.transaction.type !== 'batchAll') {
    return tx.transaction;
  }

  const transactionMatch = tx.transaction.args.transactions.find((tx: Transaction) => {
    return tx.type === TransactionType.BOND || tx.type === TransactionType.UNSTAKE;
  });

  return transactionMatch || tx.transaction.args.transactions[0];
};
