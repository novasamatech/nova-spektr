import { TFunction } from 'react-i18next';

import { IconNames } from '@renderer/shared/ui/types';
import { Explorer } from '@renderer/entities/chain/model/chain';
import { AccountId, HexString } from '@renderer/domain/shared-kernel';
import {
  DecodedTransaction,
  MultisigTxFinalStatus,
  MultisigTxInitStatus,
  Transaction,
  TransactionType,
} from '@renderer/entities/transaction/model/transaction';
import { toAddress, formatSectionAndMethod } from '@renderer/shared/lib/utils';
import { Account } from '@renderer/entities/account/model/account';
import { Signatory } from '@renderer/entities/signatory/model/signatory';
import type { Contact } from '@renderer/entities/contact';

export const UNKNOWN_TYPE = 'UNKNOWN_TYPE';
export const TRANSACTION_UNKNOWN = 'operations.titles.unknown';
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
  [TransactionType.CHILL]: 'operations.titles.unstake',
  [TransactionType.BATCH_ALL]: 'operations.titles.unknown',
};

const TransactionIcons: Record<TransactionType, IconNames> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'arrow-diagonal',
  [TransactionType.ORML_TRANSFER]: 'arrow-diagonal',
  [TransactionType.TRANSFER]: 'arrow-diagonal',
  [TransactionType.MULTISIG_AS_MULTI]: 'arrow-diagonal',
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: 'arrow-diagonal',
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: 'arrow-diagonal',
  // Staking
  [TransactionType.BOND]: 'start-staking',
  [TransactionType.NOMINATE]: 'start-staking',
  [TransactionType.STAKE_MORE]: 'start-staking',
  [TransactionType.REDEEM]: 'start-staking',
  [TransactionType.RESTAKE]: 'start-staking',
  [TransactionType.DESTINATION]: 'start-staking',
  [TransactionType.UNSTAKE]: 'start-staking',
  // Technical
  [TransactionType.CHILL]: 'start-staking',
  [TransactionType.BATCH_ALL]: 'learn-more',
};

export const getTransactionTitle = (transaction?: Transaction | DecodedTransaction): string => {
  if (!transaction) return TRANSACTION_UNKNOWN;

  if (!transaction.type) {
    return formatSectionAndMethod(transaction.section, transaction.method);
  }

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getTransactionTitle(transaction?.args?.transactions?.[0]);
  }

  return TransactionTitles[transaction.type];
};

export const getIconName = (transaction?: Transaction | DecodedTransaction): IconNames => {
  if (!transaction?.type) return 'learn-more';

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getIconName(transaction?.args?.transactions?.[0]);
  }

  return TransactionIcons[transaction.type];
};

export const sortByDateDesc = <T>([dateA]: [string, T[]], [dateB]: [string, T[]]) =>
  new Date(dateA) < new Date(dateB) ? 1 : -1;

export const sortByDateAsc = <T>([dateA]: [string, T[]], [dateB]: [string, T[]]) =>
  new Date(dateA) > new Date(dateB) ? 1 : -1;

export const getExtrinsicLink = (hash?: HexString, explorers?: Explorer[]): string | undefined => {
  const extrinsicLink = explorers?.find((e) => e.extrinsic)?.extrinsic;

  if (!extrinsicLink || !hash) return;

  return extrinsicLink.replace('{hash}', hash);
};

export const getMultisigExtrinsicLink = (
  callHash?: HexString,
  indexCreated?: number,
  blockCreated?: number,
  explorers?: Explorer[],
): string | undefined => {
  if (!callHash || !indexCreated || !blockCreated || !explorers) return;

  const multisigLink = explorers.find((e) => e.multisig)?.multisig;

  if (!multisigLink) return;

  return multisigLink.replace('{index}', `${blockCreated}-${indexCreated}`).replace('{callHash}', callHash);
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

export const getTransactionAmount = (tx: Transaction | DecodedTransaction): string | null => {
  const txType = tx.type;
  if (!txType) return null;

  if (
    [
      TransactionType.ASSET_TRANSFER,
      TransactionType.ORML_TRANSFER,
      TransactionType.TRANSFER,
      TransactionType.BOND,
      TransactionType.RESTAKE,
      TransactionType.UNSTAKE,
    ].includes(txType)
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

  return null;
};

export const getSignatoryName = (
  signatoryId: AccountId,
  txSignatories: Signatory[],
  contacts: Contact[],
  accounts: Account[],
  addressPrefix?: number,
): string => {
  const finderFn = <T extends { accountId: AccountId }>(collection: T[]): T | undefined => {
    return collection.find((c) => c.accountId === signatoryId);
  };

  // signatory data source priority: transaction -> contacts -> wallets -> address
  const fromTx = finderFn(txSignatories)?.name;
  if (fromTx) return fromTx;

  const fromContact = finderFn(contacts)?.name;
  if (fromContact) return fromContact;

  const fromAccount = finderFn(accounts)?.name;
  if (fromAccount) return fromAccount;

  return toAddress(signatoryId, { chunk: 5, prefix: addressPrefix });
};
