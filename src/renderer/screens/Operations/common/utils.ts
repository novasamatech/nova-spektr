import { TFunction } from 'react-i18next';

import { IconNames } from '@renderer/components/ui/Icon/data';
import { Explorer } from '@renderer/domain/chain';
import { HexString } from '@renderer/domain/shared-kernel';
import {
  MultisigTxFinalStatus,
  MultisigTxInitStatus,
  Transaction,
  TransactionType,
} from '@renderer/domain/transaction';
import { MultisigTransactionDS } from '@renderer/services/storage';

export const UNKNOWN_TYPE = 'UNKNOWN_TYPE';
export const TransferTypes = [TransactionType.TRANSFER, TransactionType.ASSET_TRANSFER, TransactionType.ORML_TRANSFER];

const TransactionTitles: Record<TransactionType, string> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'operations.titles.transfer',
  [TransactionType.ORML_TRANSFER]: 'operations.titles.transfer',
  [TransactionType.TRANSFER]: 'operations.titles.transfer',
  [TransactionType.MULTISIG_AS_MULTI]: 'operations.titles.approveMultisig',
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: 'operations.titles.approveMultisig',
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: 'operations.titles.cancelMultisig',
  // Staking
  [TransactionType.BOND]: 'operations.titles.startStaking',
  [TransactionType.NOMINATE]: 'operations.titles.nominate',
  [TransactionType.STAKE_MORE]: 'operations.titles.stakeMore',
  [TransactionType.REDEEM]: 'operations.titles.redeem',
  [TransactionType.RESTAKE]: 'operations.titles.restake',
  [TransactionType.DESTINATION]: 'operations.titles.destination',
  [TransactionType.UNSTAKE]: 'operations.titles.unstake',
  // Technical
  [TransactionType.CHILL]: 'operations.titles.unknown',
  [TransactionType.BATCH_ALL]: 'operations.titles.unknown',
};

const TransactionIcons: Record<TransactionType, IconNames> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'staking',
  [TransactionType.ORML_TRANSFER]: 'staking',
  [TransactionType.TRANSFER]: 'staking',
  [TransactionType.MULTISIG_AS_MULTI]: 'staking',
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: 'staking',
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: 'staking',
  // Staking
  [TransactionType.BOND]: 'staking',
  [TransactionType.NOMINATE]: 'staking',
  [TransactionType.STAKE_MORE]: 'staking',
  [TransactionType.REDEEM]: 'staking',
  [TransactionType.RESTAKE]: 'staking',
  [TransactionType.DESTINATION]: 'staking',
  [TransactionType.UNSTAKE]: 'staking',
  // Technical
  [TransactionType.CHILL]: 'question',
  [TransactionType.BATCH_ALL]: 'question',
};

export const getTransactionTitle = (transaction?: Transaction): string => {
  if (!transaction?.type) return 'operations.titles.unknown';

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getTransactionTitle(transaction?.args?.calls?.[0]);
  }

  return TransactionTitles[transaction.type];
};

export const getIconName = (transaction?: Transaction): IconNames => {
  if (!transaction?.type) return 'question';

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getIconName(transaction?.args?.calls?.[0]);
  }

  return TransactionIcons[transaction.type];
};

export const sortByDate = ([dateA]: [string, MultisigTransactionDS[]], [dateB]: [string, MultisigTransactionDS[]]) =>
  new Date(dateA) < new Date(dateB) ? 1 : -1;

export const getMultisigExtrinsicLink = (
  callHash?: HexString,
  indexCreated?: number,
  blockCreated?: number,
  explorers?: Explorer[],
): string | undefined => {
  if (!callHash || !indexCreated || !blockCreated || !explorers) return;

  const multisigLink = explorers.find((e) => e.multisig);

  if (!multisigLink?.multisig) return;

  return multisigLink.multisig.replace('{index}', `${blockCreated}-${indexCreated}`).replace('{callHash}', callHash);
};

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
