import { type TFunction } from 'i18next';

import { TransactionType } from '@/shared/core';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { type MultisigOperation, type OperationData } from '@/domains/multisig';
import { operationDetailsUtils } from '@/entities/operations';
import { findCoreBatchAll, getTransactionType, isEditDelegationTransaction } from '@/entities/transaction';

const TRANSACTION_UNKNOWN = 'operations.titles.unknown';

const TransactionTitlesModal: Record<TransactionType, (crossChain: boolean) => string> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.ORML_TRANSFER]: crossChain => `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.TRANSFER]: crossChain => `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.TRANSFER_ALL]: crossChain => `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.MULTISIG_AS_MULTI]: () => 'operations.modalTitles.approveMultisig',
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: () => 'operations.modalTitles.approveMultisig',
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: () => 'operations.modalTitles.cancelMultisig',
  // XCM
  [TransactionType.XCM_LIMITED_TRANSFER]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.XCM_TELEPORT]: crossChain => `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.POLKADOT_XCM_TELEPORT]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: crossChain =>
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
  // Remark
  [TransactionType.REMARK]: () => 'operations.modalTitles.remark',
  // Governance
  [TransactionType.UNLOCK]: () => 'operations.modalTitles.unlockOn',
  [TransactionType.VOTE]: () => 'operations.modalTitles.vote',
  [TransactionType.REVOTE]: () => 'operations.modalTitles.revote',
  [TransactionType.REMOVE_VOTE]: () => 'operations.modalTitles.removeVote',
  [TransactionType.DELEGATE]: () => 'operations.modalTitles.delegateOn',
  [TransactionType.UNDELEGATE]: () => 'operations.modalTitles.undelegateOn',
  [TransactionType.EDIT_DELEGATION]: () => 'operations.modalTitles.editDelegationOn',
  [TransactionType.COLLECTIVE_VOTE]: () => 'operations.modalTitles.vote',
  [TransactionType.COLLECTIVE_SET_ACTIVE]: () => 'fellowship.profile.setActive.title',
  [TransactionType.COLLECTIVE_SALARY_INDUCT]: () => 'fellowship.profile.setActive.title',
  [TransactionType.COLLECTIVE_SALARY_REQUEST]: () => 'fellowship.salary.salaryRequest',
  [TransactionType.COLLECTIVE_SALARY_PAYOUT]: () => 'fellowship.salary.salaryPayout',
  [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: () => 'fellowship.salary.promotionTitle',
};

export const getModalTransactionTitle = (crossChain: boolean, t: TFunction, transaction?: OperationData): string => {
  if (!transaction) return TRANSACTION_UNKNOWN;

  const coreTx = operationDetailsUtils.getOperationData(transaction);
  if (!coreTx) return TRANSACTION_UNKNOWN;

  const transactionType = getTransactionType(coreTx.method, coreTx.section);

  if (!transactionType && transaction.section && transaction.method) {
    return formatSectionAndMethod(transaction.section, transaction.method);
  }

  if (isEditDelegationTransaction(transaction)) {
    return t('operations.modalTitles.editDelegationOn');
  }

  if (transactionType === TransactionType.BATCH_ALL) {
    const txMatch = findCoreBatchAll(transaction);

    return getModalTransactionTitle(crossChain, t, txMatch);
  }

  return transactionType ? TransactionTitlesModal[transactionType](crossChain) : '';
};

// TODO remove
export const getMultisigSignOperationTitle = (
  crossChain: boolean,
  t: TFunction,
  type?: TransactionType,
  transaction?: MultisigOperation,
) => {
  if (!transaction) return;

  const coreTx = operationDetailsUtils.getOperationData(transaction);
  const innerTxTitle = getModalTransactionTitle(crossChain, t, coreTx);

  if (type === TransactionType.MULTISIG_AS_MULTI || type === TransactionType.MULTISIG_APPROVE_AS_MULTI) {
    return `${t('operations.modalTitles.approve')} ${t(innerTxTitle)}`;
  }

  if (type === TransactionType.MULTISIG_CANCEL_AS_MULTI) {
    return `${t('operations.modalTitles.reject')} ${t(innerTxTitle)}`;
  }

  return '';
};
