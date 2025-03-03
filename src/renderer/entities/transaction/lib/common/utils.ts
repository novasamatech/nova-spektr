import { type ApiPromise } from '@polkadot/api';
import { type DispatchError } from '@polkadot/types/interfaces';
import { type SpRuntimeDispatchError } from '@polkadot/types/lookup';

import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';
import { type OperationData } from '@/domains/multisig';
import { type VoteTransaction, voteTransactionService } from '@/entities/governance';
import { operationDetailsUtils } from '@/entities/operations';
import { getTransactionType } from '../callDataDecoder';

import {
  CONTROLLER_ARG_NAME,
  DEST_WEIGHT_ARG_NAME,
  MAX_WEIGHT,
  ManageProxyTypes,
  OLD_MULTISIG_ARGS_AMOUNT,
  TransferTypes,
  XcmTypes,
} from './constants';

export const decodeDispatchError = (error: DispatchError | SpRuntimeDispatchError, api: ApiPromise): string => {
  let errorInfo = error.toString();

  if (error.isModule) {
    const decoded = api.registry.findMetaError(error.asModule);

    errorInfo = decoded.name
      .split(/(?=[A-Z])/)
      .map((w) => w.toLowerCase())
      .join(' ');
  }

  return errorInfo;
};

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

export const isXcmTransaction = (transaction?: OperationData): boolean => {
  const operationType = getTransactionType(transaction?.method, transaction?.section);
  if (!operationType) return false;

  return XcmTypes.includes(operationType);
};

export const isTransferTransaction = (transaction?: OperationData): boolean => {
  const operationType = getTransactionType(transaction?.method, transaction?.section);
  if (!operationType) return false;

  return TransferTypes.includes(operationType);
};

export const isManageProxyTransaction = (transaction?: OperationData): boolean => {
  const operationType = getTransactionType(transaction?.method, transaction?.section);
  if (!operationType) return false;

  return ManageProxyTypes.includes(operationType);
};

export const isProxyTypeTransaction = (transaction?: OperationData): boolean => {
  return (
    isProxyTransaction(transaction) ||
    isAddProxyTransaction(transaction) ||
    isRemoveProxyTransaction(transaction) ||
    isCreatePureProxyTransaction(transaction) ||
    isRemovePureProxyTransaction(transaction)
  );
};

export const isAddProxyTransaction = (transaction?: OperationData): boolean => {
  const transactionType = getTransactionType(transaction?.method, transaction?.section);

  return transactionType === TransactionType.ADD_PROXY;
};

export const isCreatePureProxyTransaction = (transaction?: OperationData): boolean => {
  const transactionType = getTransactionType(transaction?.method, transaction?.section);

  return transactionType === TransactionType.CREATE_PURE_PROXY;
};

export const isRemoveProxyTransaction = (transaction?: OperationData): boolean => {
  const transactionType = getTransactionType(transaction?.method, transaction?.section);

  return transactionType === TransactionType.REMOVE_PROXY;
};

export const isRemovePureProxyTransaction = (transaction?: OperationData): boolean => {
  const transactionType = getTransactionType(transaction?.method, transaction?.section);

  return transactionType === TransactionType.REMOVE_PURE_PROXY;
};

export const isProxyTransaction = (transaction?: OperationData): boolean => {
  const transactionType = getTransactionType(transaction?.method, transaction?.section);

  return transactionType === TransactionType.PROXY;
};

export const isEditDelegationTransaction = (transaction?: OperationData): boolean => {
  const transactionType = getTransactionType(transaction?.method, transaction?.section);

  if (transactionType === TransactionType.BATCH_ALL) {
    const delegateTx = transaction?.args?.transactions?.some(isDelegateTransaction);
    const undelegateTx = transaction?.args?.transactions?.some(isUndelegateTransaction);

    return delegateTx && undelegateTx;
  }

  return false;
};

export const isDelegateTransaction = (transaction?: OperationData): boolean => {
  return (
    !!transaction &&
    hasTransaction(transaction, (tx) => getTransactionType(tx?.method, tx?.section) === TransactionType.DELEGATE)
  );
};

export const isUndelegateTransaction = (transaction?: OperationData): boolean => {
  return (
    !!transaction &&
    hasTransaction(transaction, (tx) => getTransactionType(tx?.method, tx?.section) === TransactionType.UNDELEGATE)
  );
};

export const isUnlockTransaction = (transaction?: OperationData): boolean => {
  return (
    !!transaction &&
    hasTransaction(transaction, (tx) => getTransactionType(tx?.method, tx?.section) === TransactionType.UNLOCK)
  );
};

export const hasTransaction = (
  transaction: OperationData,
  filter: (transaction: OperationData) => boolean,
): boolean => {
  const transactionType = getTransactionType(transaction?.method, transaction?.section);

  if (transactionType === TransactionType.BATCH_ALL) {
    return transaction.args?.calls?.some((tx: Transaction) => hasTransaction(tx, filter)) ?? false;
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
  ]);

  return batchAllOperations.has(type);
};

export const findCoreBatchAll = (coreTx: OperationData): OperationData => {
  if (isUnlockTransaction(coreTx)) {
    return coreTx.args?.calls?.find((t: Transaction) => t.type === TransactionType.UNLOCK) || coreTx;
  }

  const supportedTransaction = coreTx.args?.calls?.find((tx: OperationData) => {
    const transactionType = getTransactionType(tx.method, tx.section);

    if (!transactionType) return;

    return isWrappedInBatchAll(transactionType);
  });

  return supportedTransaction || coreTx.args?.calls?.[0];
};

export const oldFindCoreBatchAll = (coreTx: Transaction | DecodedTransaction): Transaction => {
  if (isUnlockTransaction(coreTx)) {
    return coreTx.args?.transactions?.find((t: Transaction) => t.type === TransactionType.UNLOCK) || coreTx;
  }

  const supportedTransaction = coreTx.args?.transactions?.find((tx: Transaction) => isWrappedInBatchAll(tx.type));

  return supportedTransaction || coreTx.args?.transactions?.[0];
};

export const getTransactionAmount = (tx: OperationData): string | null => {
  if (!tx) return null;

  const txType = getTransactionType(tx.method, tx.section);
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
    return tx.args?.value.replaceAll(',', '');
  }

  if (txType === TransactionType.STAKE_MORE) {
    return tx.args?.maxAdditional.replaceAll(',', '');
  }

  if (txType === TransactionType.DELEGATE) {
    return tx.args?.balance.replaceAll(',', '');
  }

  if (isEditDelegationTransaction(tx)) {
    const transactions = tx.args?.calls;
    if (!transactions) return null;

    const txMatch = transactions.find((tx: Transaction) => tx.type === TransactionType.DELEGATE);

    return getTransactionAmount(txMatch);
  }

  if (txType === TransactionType.BATCH_ALL) {
    // multi tx made with batch all:
    // unstake - chill, unbond
    // start staking - bond, nominate
    // unlock - unlock, remove_vote
    if (!tx.args?.calls) return null;
    const txMatch = operationDetailsUtils.getOperationData(tx);

    if (txMatch) {
      return getTransactionAmount(txMatch);
    }

    return null;
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

  return null;
};
