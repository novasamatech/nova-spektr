import { type TFunction } from 'react-i18next';

import { MultisigTxFinalStatus, MultisigTxInitStatus, TransactionType } from '@shared/core';

import { UNKNOWN_TYPE } from './constants';

export const getStatusOptions = (t: TFunction) => {
  return [
    {
      id: MultisigTxInitStatus.SIGNING,
      value: MultisigTxInitStatus.SIGNING,
      element: t('operation.status.signing'),
    },
    {
      id: MultisigTxFinalStatus.CANCELLED,
      value: MultisigTxFinalStatus.CANCELLED,
      element: t('operation.status.cancelled'),
    },
    {
      id: MultisigTxFinalStatus.ERROR,
      value: MultisigTxFinalStatus.ERROR,
      element: t('operation.status.error'),
    },
    {
      id: MultisigTxFinalStatus.ESTABLISHED,
      value: MultisigTxFinalStatus.ESTABLISHED,
      element: t('operation.status.established'),
    },
    {
      id: MultisigTxFinalStatus.EXECUTED,
      value: MultisigTxFinalStatus.EXECUTED,
      element: t('operation.status.executed'),
    },
  ];
};

export const getTransactionOptions = (t: TFunction) => {
  return [
    {
      id: TransactionType.TRANSFER,
      value: TransactionType.TRANSFER,
      element: t('operations.titles.transfer'),
    },
    {
      id: TransactionType.XCM_LIMITED_TRANSFER,
      value: TransactionType.XCM_LIMITED_TRANSFER,
      element: t('operations.titles.crossChainTransfer'),
    },
    {
      id: TransactionType.BOND,
      value: TransactionType.BOND,
      element: t('operations.titles.startStaking'),
    },
    {
      id: TransactionType.STAKE_MORE,
      value: TransactionType.STAKE_MORE,
      element: t('operations.titles.stakeMore'),
    },
    {
      id: TransactionType.DESTINATION,
      value: TransactionType.DESTINATION,
      element: t('operations.titles.destination'),
    },
    {
      id: TransactionType.NOMINATE,
      value: TransactionType.NOMINATE,
      element: t('operations.titles.nominate'),
    },
    {
      id: TransactionType.REDEEM,
      value: TransactionType.REDEEM,
      element: t('operations.titles.redeem'),
    },
    {
      id: TransactionType.RESTAKE,
      value: TransactionType.RESTAKE,
      element: t('operations.titles.restake'),
    },
    {
      id: TransactionType.UNSTAKE,
      value: TransactionType.UNSTAKE,
      element: t('operations.titles.unstake'),
    },
    {
      id: TransactionType.ADD_PROXY,
      value: TransactionType.ADD_PROXY,
      element: t('operations.titles.addProxy'),
    },
    {
      id: TransactionType.REMOVE_PROXY,
      value: TransactionType.REMOVE_PROXY,
      element: t('operations.titles.removeProxy'),
    },
    {
      id: TransactionType.CREATE_PURE_PROXY,
      value: TransactionType.CREATE_PURE_PROXY,
      element: t('operations.titles.createPureProxy'),
    },
    {
      id: TransactionType.REMOVE_PURE_PROXY,
      value: TransactionType.REMOVE_PURE_PROXY,
      element: t('operations.titles.removePureProxy'),
    },
    {
      id: TransactionType.UNLOCK,
      value: TransactionType.UNLOCK,
      element: t('operations.titles.unlock'),
    },
    {
      id: TransactionType.REMOVE_VOTE,
      value: TransactionType.REMOVE_VOTE,
      element: t('operations.titles.unlock'),
    },
    {
      id: UNKNOWN_TYPE,
      value: UNKNOWN_TYPE,
      element: t('operations.titles.unknown'),
    },
  ];
};
