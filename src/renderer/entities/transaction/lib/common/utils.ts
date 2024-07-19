import { type ApiPromise } from '@polkadot/api';
import { type SpRuntimeDispatchError } from '@polkadot/types/lookup';
import { type TFunction } from 'react-i18next';

import { type DecodedTransaction, type MultisigTransaction, type Transaction, TransactionType } from '@shared/core';
import { formatSectionAndMethod } from '@shared/lib/utils';

import {
  CONTROLLER_ARG_NAME,
  DEST_WEIGHT_ARG_NAME,
  MAX_WEIGHT,
  ManageProxyTypes,
  OLD_MULTISIG_ARGS_AMOUNT,
  TransferTypes,
  XcmTypes,
} from './constants';

export const decodeDispatchError = (error: SpRuntimeDispatchError, api: ApiPromise): string => {
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

export const isXcmTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  if (!transaction?.type) return false;

  return XcmTypes.includes(transaction.type);
};

export const isTransferTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  if (!transaction?.type) return false;

  return TransferTypes.includes(transaction.type);
};

export const isManageProxyTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  if (!transaction?.type) return false;

  return ManageProxyTypes.includes(transaction.type);
};

export const isAddProxyTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  return transaction?.type === TransactionType.ADD_PROXY;
};

export const isCreatePureProxyTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  return transaction?.type === TransactionType.CREATE_PURE_PROXY;
};

export const isRemoveProxyTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  return transaction?.type === TransactionType.REMOVE_PROXY;
};

export const isRemovePureProxyTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  return transaction?.type === TransactionType.REMOVE_PURE_PROXY;
};

export const isProxyTransaction = (transaction?: Transaction | DecodedTransaction): boolean => {
  return transaction?.type === TransactionType.PROXY;
};

export const getTransactionAmount = (tx: Transaction | DecodedTransaction): string | null => {
  const txType = tx.type;
  if (!txType) return null;

  if (
    [...TransferTypes, ...XcmTypes, TransactionType.BOND, TransactionType.RESTAKE, TransactionType.UNSTAKE].includes(
      txType,
    )
  ) {
    return tx.args.value;
  }
  if (txType === TransactionType.STAKE_MORE) {
    return tx.args.maxAdditional;
  }
  if (txType === TransactionType.BATCH_ALL) {
    // multi staking tx made with batch all:
    // unstake - chill, unbond
    // start staking - bond, nominate
    const transactions = tx.args?.transactions;
    if (!transactions) return null;

    const txMatch = transactions.find(
      (tx: Transaction) => tx.type === TransactionType.BOND || tx.type === TransactionType.UNSTAKE,
    );

    return getTransactionAmount(txMatch);
  }
  if (txType === TransactionType.PROXY) {
    const transaction = tx.args?.transaction;
    if (!transaction) return null;

    return getTransactionAmount(transaction);
  }

  return null;
};

export const TRANSACTION_UNKNOWN = 'operations.titles.unknown';

const TransactionTitles: Record<TransactionType, string> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'operations.titles.transfer',
  [TransactionType.ORML_TRANSFER]: 'operations.titles.transfer',
  [TransactionType.TRANSFER]: 'operations.titles.transfer',
  [TransactionType.MULTISIG_AS_MULTI]: 'operations.titles.approveMultisig',
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: 'operations.titles.approveMultisig',
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: 'operations.titles.cancelMultisig',
  // XCM
  [TransactionType.XCM_LIMITED_TRANSFER]: 'operations.titles.crossChainTransfer',
  [TransactionType.XCM_TELEPORT]: 'operations.titles.crossChainTransfer',
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: 'operations.titles.crossChainTransfer',
  [TransactionType.POLKADOT_XCM_TELEPORT]: 'operations.titles.crossChainTransfer',
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: 'operations.titles.crossChainTransfer',
  // Staking
  [TransactionType.BOND]: 'operations.titles.startStaking',
  [TransactionType.NOMINATE]: 'operations.titles.nominate',
  [TransactionType.STAKE_MORE]: 'operations.titles.stakeMore',
  [TransactionType.REDEEM]: 'operations.titles.redeem',
  [TransactionType.RESTAKE]: 'operations.titles.restake',
  [TransactionType.DESTINATION]: 'operations.titles.destination',
  [TransactionType.UNSTAKE]: 'operations.titles.unstake',
  // Technical
  [TransactionType.CHILL]: 'operations.titles.unstake',
  [TransactionType.BATCH_ALL]: 'operations.titles.unknown',
  // Proxy
  [TransactionType.ADD_PROXY]: 'operations.titles.addProxy',
  [TransactionType.CREATE_PURE_PROXY]: 'operations.titles.createPureProxy',
  [TransactionType.REMOVE_PROXY]: 'operations.titles.removeProxy',
  [TransactionType.REMOVE_PURE_PROXY]: 'operations.titles.removePureProxy',
  [TransactionType.PROXY]: 'operations.titles.proxy',
  // Governance
  [TransactionType.UNLOCK]: 'operations.titles.unlock',
  [TransactionType.REMOVE_VOTE]: 'operations.titles.unlock',
  [TransactionType.DELEGATE]: 'operations.titles.delegate',
  [TransactionType.UNDELEGATE]: 'operations.titles.undelegate',
};

const TransactionTitlesModal: Record<TransactionType, (crossChain: boolean) => string> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: (crossChain) =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.ORML_TRANSFER]: (crossChain) =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.TRANSFER]: (crossChain) => `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.MULTISIG_AS_MULTI]: () => 'operations.modalTitles.approveMultisig',
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: () => 'operations.modalTitles.approveMultisig',
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: () => 'operations.modalTitles.cancelMultisig',
  // XCM
  [TransactionType.XCM_LIMITED_TRANSFER]: (crossChain) =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.XCM_TELEPORT]: (crossChain) =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: (crossChain) =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.POLKADOT_XCM_TELEPORT]: (crossChain) =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: (crossChain) =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  // Staking
  [TransactionType.BOND]: () => 'operations.modalTitles.startStakingOn',
  [TransactionType.NOMINATE]: () => 'operations.modalTitles.nominateOn',
  [TransactionType.STAKE_MORE]: () => 'operations.modalTitles.stakeMoreOn',
  [TransactionType.REDEEM]: () => 'operations.modalTitles.redeemOn',
  [TransactionType.RESTAKE]: () => 'operations.modalTitles.restakeOn',
  [TransactionType.DESTINATION]: () => 'operations.modalTitles.destinationOn',
  [TransactionType.UNSTAKE]: () => 'operations.modalTitles.unstakeOn',
  // Technical
  [TransactionType.CHILL]: () => 'operations.modalTitles.unstakeOn',
  [TransactionType.BATCH_ALL]: () => 'operations.modalTitles.unknownOn',
  // Proxy
  [TransactionType.ADD_PROXY]: () => 'operations.modalTitles.addProxy',
  [TransactionType.CREATE_PURE_PROXY]: () => 'operations.modalTitles.createPureProxy',
  [TransactionType.REMOVE_PROXY]: () => 'operations.modalTitles.removeProxy',
  [TransactionType.REMOVE_PURE_PROXY]: () => 'operations.modalTitles.removePureProxy',
  [TransactionType.PROXY]: () => 'operations.modalTitles.proxy',
  [TransactionType.UNLOCK]: () => 'operations.modalTitles.unlockOn',
  [TransactionType.REMOVE_VOTE]: () => 'operations.modalTitles.unlockOn',
  [TransactionType.DELEGATE]: () => 'operations.modalTitles.delegateOn',
  [TransactionType.UNDELEGATE]: () => 'operations.modalTitles.undelegateOn',
};

export const getTransactionTitle = (t: TFunction, transaction?: Transaction | DecodedTransaction): string => {
  if (!transaction) return TRANSACTION_UNKNOWN;

  if (!transaction.type) {
    return formatSectionAndMethod(transaction.section, transaction.method);
  }

  if (transaction.type === TransactionType.BATCH_ALL) {
    const delegateTx = transaction.args.transactions?.find((tx: Transaction) => tx.type === TransactionType.DELEGATE);
    const undelegateTx = transaction.args.transactions?.find(
      (tx: Transaction) => tx.type === TransactionType.UNDELEGATE,
    );

    if (delegateTx && undelegateTx) {
      return t('operations.titles.editDelegation');
    }
  }

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getTransactionTitle(transaction.args?.transactions?.[0]);
  }

  if (transaction.type === TransactionType.PROXY) {
    return getTransactionTitle(transaction.args?.transaction);
  }

  return TransactionTitles[transaction.type];
};

export const getModalTransactionTitle = (
  crossChain: boolean,
  t: TFunction,
  transaction?: Transaction | DecodedTransaction,
): string => {
  if (!transaction) return TRANSACTION_UNKNOWN;

  if (!transaction.type) {
    return formatSectionAndMethod(transaction.section, transaction.method);
  }

  if (transaction.type === TransactionType.BATCH_ALL) {
    const delegateTx = transaction.args.transactions?.find((tx: Transaction) => tx.type === TransactionType.DELEGATE);
    const undelegateTx = transaction.args.transactions?.find(
      (tx: Transaction) => tx.type === TransactionType.UNDELEGATE,
    );

    if (delegateTx && undelegateTx) {
      return t('operations.modalTitles.editDelegationOn');
    }
  }

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getModalTransactionTitle(crossChain, transaction.args?.transactions?.[0]);
  }

  if (transaction.type === TransactionType.PROXY) {
    return getModalTransactionTitle(crossChain, transaction.args?.transaction);
  }

  return TransactionTitlesModal[transaction.type](crossChain);
};

export const getMultisigSignOperationTitle = (
  crossChain: boolean,
  t: TFunction,
  type?: TransactionType,
  transaction?: MultisigTransaction,
) => {
  const innerTxTitle = getModalTransactionTitle(crossChain, t, transaction?.transaction);

  if (type === TransactionType.MULTISIG_AS_MULTI || type === TransactionType.MULTISIG_APPROVE_AS_MULTI) {
    return `${t('operations.modalTitles.approve')} ${t(innerTxTitle)}`;
  }

  if (type === TransactionType.MULTISIG_CANCEL_AS_MULTI) {
    return `${t('operations.modalTitles.reject')} ${t(innerTxTitle)}`;
  }

  return '';
};
