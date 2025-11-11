import { type ApiPromise } from '@polkadot/api';

import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type VoteTransaction, voteTransactionService } from '@/entities/governance';

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
  return !!api.tx.xTokens.transferMultiasset.meta.args.find((n) => n.name.toString() === DEST_WEIGHT_ARG_NAME);
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

export const isEditDelegationTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  if (transaction?.type === TransactionType.BATCH_ALL) {
    const delegateTx = transaction.args.transactions?.some(isDelegateTransaction);
    const undelegateTx = transaction.args.transactions?.some(isUndelegateTransaction);

    return delegateTx && undelegateTx;
  }

  return false;
};

export const isDelegateTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  return !!transaction && hasTransaction(transaction, (tx) => tx.type === TransactionType.DELEGATE);
};

export const isUndelegateTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  return !!transaction && hasTransaction(transaction, (tx) => tx.type === TransactionType.UNDELEGATE);
};

export const isUnlockTransaction = (transaction?: Transaction | DecodedTransaction | null): boolean => {
  return !!transaction && hasTransaction(transaction, (tx) => tx.type === TransactionType.UNLOCK);
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

  return (
    isRemoveProxyTransaction(removeProxyTransaction) &&
    isAddProxyTransaction(addProxyTransaction) &&
    addProxyTransaction.args.proxyType === 'Any'
  );
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

export const isWrappedInBatchAll = (type: TransactionType) => {
  const batchAllOperations = new Set([
    TransactionType.UNSTAKE,
    TransactionType.BOND,
    TransactionType.UNLOCK,
    TransactionType.DELEGATE,
    TransactionType.UNDELEGATE,
    TransactionType.REMOVE_VOTE,
    TransactionType.VESTED_TRANSFER,
  ]);

  return batchAllOperations.has(type);
};

export const findCoreBatchAll = (coreTx: Transaction | DecodedTransaction): Transaction => {
  if (isUnlockTransaction(coreTx)) {
    return coreTx.args?.transactions?.find((t: Transaction) => t.type === TransactionType.UNLOCK) || coreTx;
  }

  const supportedTransaction = coreTx.args?.transactions?.find((tx: Transaction) => isWrappedInBatchAll(tx.type));

  return supportedTransaction || coreTx.args?.transactions?.[0];
};

export const findCoreTransaction = (tx: DecodedTransaction | null): DecodedTransaction | null => {
  if (!tx) return null;

  if (isProxyTransaction(tx)) {
    return findCoreTransaction(tx.args?.transaction) || tx;
  }

  return tx;
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
    if (!tx.args?.transactions) return null;
    const txMatch = findCoreBatchAll(tx);

    return getTransactionAmount(txMatch);
  }

  if (txType === TransactionType.PROXY) {
    const transaction = tx.args?.transaction;
    if (!transaction) return null;

    return getTransactionAmount(transaction);
  }

  if (txType === TransactionType.VOTE) {
    const transaction = tx as unknown as VoteTransaction;
    const vote = transaction.args.vote;

    if (voteTransactionService.isStandardVote(vote)) {
      return vote.Standard.balance.replaceAll(',', '');
    } else {
      return vote.SplitAbstain.abstain.replaceAll(',', '');
    }
  }

  if (txType === TransactionType.VESTED_TRANSFER) {
    return tx.args.schedule.locked;
  }

  return null;
};
