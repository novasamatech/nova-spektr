import { TFunction } from 'react-i18next';

import {
  MultisigTxInitStatus,
  MultisigTxFinalStatus,
  TransactionType,
} from '@renderer/entities/transaction/model/transaction';
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
      id: UNKNOWN_TYPE,
      value: UNKNOWN_TYPE,
      element: t('operations.titles.unknown'),
    },
  ];
};
