import { IconNames } from '@renderer/shared/ui/Icon/data';
import { Explorer } from '@renderer/entities/chain/model/chain';
import { AccountId, HexString } from '@renderer/domain/shared-kernel';
import { DecodedTransaction, Transaction, TransactionType } from '@renderer/entities/transaction/model/transaction';
import { toAddress, formatSectionAndMethod } from '@renderer/shared/lib/utils';
import { Account } from '@renderer/entities/account/model/account';
import { Signatory } from '@renderer/entities/signatory/model/signatory';
import type { Contact } from '@renderer/entities/contact';

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
};

const TransactionIcons: Record<TransactionType, IconNames> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'transferMst',
  [TransactionType.ORML_TRANSFER]: 'transferMst',
  [TransactionType.TRANSFER]: 'transferMst',
  [TransactionType.MULTISIG_AS_MULTI]: 'transferMst',
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: 'transferMst',
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: 'transferMst',
  // XCM
  [TransactionType.XCM_LIMITED_TRANSFER]: 'unknownMst',
  [TransactionType.XCM_TELEPORT]: 'unknownMst',
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: 'unknownMst',
  [TransactionType.POLKADOT_XCM_TELEPORT]: 'unknownMst',
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: 'unknownMst',
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
