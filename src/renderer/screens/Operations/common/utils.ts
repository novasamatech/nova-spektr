import { TFunction } from 'react-i18next';

import { IconNames } from '@renderer/components/ui/Icon/data';
import { Explorer } from '@renderer/domain/chain';
import { AccountId, HexString } from '@renderer/domain/shared-kernel';
import {
  DecodedTransaction,
  MultisigTxFinalStatus,
  MultisigTxInitStatus,
  Transaction,
  TransactionType,
} from '@renderer/domain/transaction';
import { toAddress } from '@renderer/shared/utils/address';
import { Contact } from '@renderer/domain/contact';
import { Account } from '@renderer/domain/account';
import { Signatory } from '@renderer/domain/signatory';

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
  [TransactionType.CHILL]: 'operations.titles.unstake',
  [TransactionType.BATCH_ALL]: 'operations.titles.unknown',
};

const TransactionIcons: Record<TransactionType, IconNames> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'transferMst',
  [TransactionType.ORML_TRANSFER]: 'transferMst',
  [TransactionType.TRANSFER]: 'transferMst',
  [TransactionType.MULTISIG_AS_MULTI]: 'transferMst',
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: 'transferMst',
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: 'transferMst',
  // Staking
  [TransactionType.BOND]: 'stakingMst',
  [TransactionType.NOMINATE]: 'stakingMst',
  [TransactionType.STAKE_MORE]: 'stakingMst',
  [TransactionType.REDEEM]: 'stakingMst',
  [TransactionType.RESTAKE]: 'stakingMst',
  [TransactionType.DESTINATION]: 'stakingMst',
  [TransactionType.UNSTAKE]: 'stakingMst',
  // Technical
  [TransactionType.CHILL]: 'stakingMst',
  [TransactionType.BATCH_ALL]: 'unknownMst',
};

export const getTransactionTitle = (transaction?: Transaction | DecodedTransaction): string => {
  if (!transaction) return 'operations.titles.unknown';

  if (!transaction.type) {
    return (
      transaction.section.charAt(0).toUpperCase() +
      transaction.section.slice(1) +
      ' ' +
      transaction.method.charAt(0).toUpperCase() +
      transaction.method.slice(1)
    );
  }

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getTransactionTitle(transaction?.args?.transactions?.[0]);
  }

  return TransactionTitles[transaction.type];
};

export const getIconName = (transaction?: Transaction | DecodedTransaction): IconNames => {
  if (!transaction?.type) return 'question';

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
  if (!txType) {
    return null;
  }
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
  // signatory data source priority: transaction -> contacts -> wallets -> address
  const fromTx = txSignatories.find((s) => s.accountId === signatoryId)?.name;
  if (fromTx) return fromTx;

  const fromContact = contacts.find((c) => c.accountId === signatoryId)?.name;
  if (fromContact) return fromContact;

  const fromAccount = accounts.find((a) => a.accountId === signatoryId)?.name;
  if (fromAccount) return fromAccount;

  return toAddress(signatoryId, { chunk: 5, prefix: addressPrefix });
};
