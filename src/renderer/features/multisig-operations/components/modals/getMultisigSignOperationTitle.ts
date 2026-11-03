import { type TFunction } from 'i18next';

import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';
import { formatSectionAndMethod } from '@/shared/lib/utils';
import { type MultisigOperation, findCoreBatchAll, isEditDelegationTransaction } from '@/domains/network';
import { type ProxyEditOperationInput, isProxyEditOperation } from '../../lib/proxy-edit';

const TRANSACTION_UNKNOWN = 'operations.titles.unknown';

const TransactionTitlesModal: Record<TransactionType, (crossChain: boolean) => string> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.ORML_TRANSFER]: crossChain => `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.TRANSFER]: crossChain => `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.TRANSFER_ALL]: crossChain => `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.TRANSFER_ALLOW_DEATH]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.VESTED_TRANSFER]: () => `operations.modalTitles.vestedTransfer`,
  [TransactionType.VEST]: () => `operations.modalTitles.vest`,
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
  [TransactionType.POLKADOT_XCM_RESERVE_WITHDRAW]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.XCM_TRANSFER_ASSETS_USING_TYPE_AND_THEN]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.XTOKENS_TRANSFER]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  [TransactionType.XTOKENS_TRANSFER_MULTIASSETS]: crossChain =>
    `operations.modalTitles.${crossChain ? 'transferFrom' : 'transferOn'}`,
  // Staking
  [TransactionType.BOND]: () => 'operations.modalTitles.startStakingOn',
  [TransactionType.NOMINATE]: () => 'operations.modalTitles.nominateOn',
  [TransactionType.STAKE_MORE]: () => 'operations.modalTitles.stakeMoreOn',
  [TransactionType.REDEEM]: () => 'operations.modalTitles.redeemOn',
  [TransactionType.RESTAKE]: () => 'operations.modalTitles.restakeOn',
  [TransactionType.DESTINATION]: () => 'operations.modalTitles.destinationOn',
  [TransactionType.UNSTAKE]: () => 'operations.modalTitles.unstakeOn',
  [TransactionType.PAYOUT_STAKERS_BY_PAGE]: () => 'operations.modalTitles.payoutStakersOn',
  // Technical
  [TransactionType.CHILL]: () => 'operations.modalTitles.unstakeOn',
  [TransactionType.BATCH_ALL]: () => 'operations.modalTitles.unknownOn',
  // Proxy
  [TransactionType.ADD_PROXY]: () => 'operations.modalTitles.addProxy',
  [TransactionType.CREATE_PURE_PROXY]: () => 'operations.modalTitles.createPureProxy',
  [TransactionType.REMOVE_PROXY]: () => 'operations.modalTitles.removeProxy',
  [TransactionType.KILL_PURE_PROXY]: () => 'operations.modalTitles.removePureProxy',
  [TransactionType.PROXY]: () => 'operations.modalTitles.proxy',
  // Remark
  [TransactionType.REMARK]: () => 'operations.modalTitles.remark',
  [TransactionType.REMARK_WITH_EVENT]: () => 'operations.modalTitles.remark',
  // Governance
  [TransactionType.UNLOCK]: () => 'operations.modalTitles.unlockOn',
  [TransactionType.VOTE]: () => 'operations.modalTitles.vote',
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
  [TransactionType.COLLECTIVE_EVIDENCE_VOTE]: () => 'operations.modalTitles.vote',
};

export const getModalTransactionTitle = (
  crossChain: boolean,
  t: TFunction,
  transaction?: Transaction | DecodedTransaction | null,
): string => {
  if (!transaction) return TRANSACTION_UNKNOWN;

  if (!transaction.type) {
    return formatSectionAndMethod(transaction.section, transaction.method);
  }

  if (isEditDelegationTransaction(transaction)) {
    return t('operations.modalTitles.editDelegationOn');
  }

  if (transaction.type === TransactionType.BATCH_ALL) {
    const txMatch = findCoreBatchAll(transaction);

    return txMatch
      ? getModalTransactionTitle(crossChain, t, txMatch)
      : TransactionTitlesModal[TransactionType.BATCH_ALL](crossChain);
  }

  if (transaction.type === TransactionType.PROXY) {
    return getModalTransactionTitle(crossChain, t, transaction.args?.transaction);
  }

  return TransactionTitlesModal[transaction.type](crossChain);
};

/**
 * Dialog title of an operation. An edit-flexible operation is detected on the
 * whole operation (the same detector as its card), since a live one is stored
 * as a bare add + remove proxy pair with the proxied account kept aside.
 */
export const getModalOperationTitle = (
  crossChain: boolean,
  t: TFunction,
  operation?: ProxyEditOperationInput | null,
): string => {
  if (operation && isProxyEditOperation(operation)) {
    return 'operations.modalTitles.editFlexibleOn';
  }

  return getModalTransactionTitle(crossChain, t, operation?.transaction);
};

// TODO remove
export const getMultisigSignOperationTitle = (
  crossChain: boolean,
  t: TFunction,
  type?: TransactionType,
  operation?: MultisigOperation,
) => {
  const innerTxTitle = getModalOperationTitle(crossChain, t, operation);

  if (type === TransactionType.MULTISIG_AS_MULTI || type === TransactionType.MULTISIG_APPROVE_AS_MULTI) {
    return `${t('operations.modalTitles.approve')} ${t(innerTxTitle)}`;
  }

  if (type === TransactionType.MULTISIG_CANCEL_AS_MULTI) {
    return `${t('operations.modalTitles.reject')} ${t(innerTxTitle)}`;
  }

  return '';
};
