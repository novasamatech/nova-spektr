import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { findCoreBatchAll, isEditDelegationTransaction } from '@/domains/network';
import { voteTransactionService } from '@/entities/governance';

import {
  CONTROLLER_ARG_NAME,
  DEST_WEIGHT_ARG_NAME,
  MAX_WEIGHT,
  ManageProxyTypes,
  OLD_MULTISIG_ARGS_AMOUNT,
  TransferTypes,
  XcmTypes,
} from './constants';

export const isOldMultisigPallet = (api: ApiPromise): boolean =>
  api.tx.multisig.asMulti.meta.args.length === OLD_MULTISIG_ARGS_AMOUNT;

export const isControllerMissing = (api: ApiPromise): boolean =>
  !api.tx.staking.bond.meta.args.find((n) => n.name.toString() === CONTROLLER_ARG_NAME);

export const getMaxWeight = (api: ApiPromise, transaction: Transaction) => {
  const maxWeight = transaction.args.maxWeight || MAX_WEIGHT;

  return (isOldMultisigPallet(api) && maxWeight.refTime) || maxWeight;
};

export const hasDestWeight = (api: ApiPromise): boolean => {
  return !!api.tx.xTokens?.transferMultiasset?.meta.args.find((n) => n.name.toString() === DEST_WEIGHT_ARG_NAME);
};

export const isXcmTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  if (!transaction?.type) return false;

  return XcmTypes.includes(transaction.type);
};

export const isTransferTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  if (!transaction?.type) return false;

  return TransferTypes.includes(transaction.type);
};

export const isManageProxyTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  if (!transaction?.type) return false;

  return ManageProxyTypes.includes(transaction.type);
};

export const isProxyTypeTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  return (
    isProxyTransaction(transaction) ||
    isAddProxyTransaction(transaction) ||
    isRemoveProxyTransaction(transaction) ||
    isCreatePureProxyTransaction(transaction) ||
    isRemovePureProxyTransaction(transaction)
  );
};

export const isAddProxyTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  return transaction?.type === TransactionType.ADD_PROXY;
};

export const isCreatePureProxyTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  return transaction?.type === TransactionType.CREATE_PURE_PROXY;
};

export const isRemoveProxyTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  return transaction?.type === TransactionType.REMOVE_PROXY;
};

export const isRemovePureProxyTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  return transaction?.type === TransactionType.KILL_PURE_PROXY;
};

export const isProxyTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  return transaction?.type === TransactionType.PROXY;
};

export const isDelegateTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  return !!transaction && hasTransaction(transaction, (tx) => tx.type === TransactionType.DELEGATE);
};

export const isUndelegateTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  return !!transaction && hasTransaction(transaction, (tx) => tx.type === TransactionType.UNDELEGATE);
};

export const isEditFlexibleTransaction = (
  transaction?: Transaction | DecodedTransaction | null,
  proxiedAccountId?: AccountId,
): boolean => {
  if (transaction?.type !== TransactionType.PROXY) {
    return false;
  }

  if (proxiedAccountId && toAccountId(transaction.args?.real) !== proxiedAccountId) {
    return false;
  }

  const batchTransaction = transaction.args?.transaction;

  if (batchTransaction?.type !== TransactionType.BATCH_ALL) {
    return false;
  }

  if (!batchTransaction.args?.transactions || batchTransaction.args.transactions.length !== 2) {
    return false;
  }

  const addProxyTransaction = batchTransaction.args.transactions.at(0);
  const removeProxyTransaction = batchTransaction.args.transactions.at(1);

  return isRemoveProxyTransaction(removeProxyTransaction) && isAddProxyTransaction(addProxyTransaction);
};

export const isMultiTransferTransaction = (transaction?: Transaction | DecodedTransaction | null) => {
  if (transaction?.type === TransactionType.BATCH_ALL) {
    const transactions = (transaction.args as { transactions?: Transaction[] })?.transactions || [];
    // Multi-transfer is a batch with TRANSFER transactions (can be 1 or more)
    return transactions.length > 0 && transactions.every((tx) => tx.type === TransactionType.TRANSFER);
  }

  return false;
};

export const isVestedTransferTransaction = (transaction?: DecodedTransaction | null) => {
  if (!transaction) {
    return false;
  }

  if (transaction?.type === TransactionType.VESTED_TRANSFER) {
    return true;
  }

  if (transaction?.type === TransactionType.BATCH_ALL) {
    const batchTx = findCoreBatchAll(transaction);
    return batchTx?.type === TransactionType.VESTED_TRANSFER;
  }

  return false;
};

export const hasTransaction = (
  transaction: Transaction | DecodedTransaction,
  filter: (transaction: Transaction | DecodedTransaction) => boolean,
): boolean => {
  if (transaction.type === TransactionType.BATCH_ALL) {
    return transaction.args.transactions?.some((tx: Transaction) => hasTransaction(tx, filter)) ?? false;
  }

  return filter(transaction);
};

export const findCoreTransaction = (tx: DecodedTransaction | null): DecodedTransaction | null => {
  if (!tx) return null;

  if (isProxyTransaction(tx)) {
    return findCoreTransaction(tx.args?.transaction) || tx;
  }

  return tx;
};

// Sums integer amounts that may carry thousands separators; null when any part is not an integer
const sumIntegerStrings = (values: unknown[]): string | null => {
  let total = new BN(0);

  for (const value of values) {
    const digits = typeof value === 'string' ? value.replaceAll(',', '') : '';
    if (!/^\d+$/.test(digits)) return null;

    total = total.add(new BN(digits));
  }

  return total.toString();
};

export const getTransactionAmount = (tx: Transaction | DecodedTransaction): string | null => {
  const txType = tx?.type;
  if (!txType) return null;

  if (txType === TransactionType.TRANSFER_ALL) {
    return null;
  }

  if (
    [
      ...TransferTypes,
      ...XcmTypes,
      TransactionType.BOND,
      TransactionType.RESTAKE,
      TransactionType.UNSTAKE,
      TransactionType.UNLOCK,
    ].includes(txType)
  ) {
    return tx.args.value;
  }

  if (txType === TransactionType.STAKE_MORE) {
    return tx.args.maxAdditional;
  }

  if (tx.type === TransactionType.DELEGATE) {
    return tx.args.balance;
  }

  if (isEditDelegationTransaction(tx)) {
    const transactions = tx.args?.transactions;
    if (!transactions) return null;

    const txMatch = transactions.find((tx: Transaction) => tx.type === TransactionType.DELEGATE);

    return getTransactionAmount(txMatch);
  }

  if (txType === TransactionType.BATCH_ALL) {
    // multi tx made with batch all:
    // unstake - chill, unbond
    // start staking - bond, nominate
    // unlock - unlock, remove_vote
    const txMatch = findCoreBatchAll(tx);

    return txMatch && getTransactionAmount(txMatch);
  }

  if (txType === TransactionType.PROXY) {
    const transaction = tx.args?.transaction;
    if (!transaction) return null;

    return getTransactionAmount(transaction);
  }

  if (txType === TransactionType.VOTE) {
    const vote = tx.args?.vote;

    if (voteTransactionService.isStandardVote(vote)) {
      return vote.Standard.balance.replaceAll(',', '');
    }
    if (voteTransactionService.isSplitVote(vote)) {
      return sumIntegerStrings([vote.Split.aye, vote.Split.nay]);
    }
    if (voteTransactionService.isSplitAbstainVote(vote)) {
      return sumIntegerStrings([vote.SplitAbstain.aye, vote.SplitAbstain.nay, vote.SplitAbstain.abstain]);
    }

    return null;
  }

  if (txType === TransactionType.VESTED_TRANSFER) {
    return tx.args.schedule.locked;
  }

  return null;
};
