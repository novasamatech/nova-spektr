import { TFunction } from 'react-i18next';

import { IconNames } from '@renderer/shared/ui/Icon/data';
import { accountUtils, walletUtils } from '@renderer/entities/wallet';
import {
  DecodedTransaction,
  MultisigEvent,
  MultisigTransaction,
  Transaction,
  TransactionType,
} from '@renderer/entities/transaction/model/transaction';
import { formatSectionAndMethod, toAddress } from '@renderer/shared/lib/utils';
import { TransferTypes, XcmTypes } from '@renderer/entities/transaction';
import type {
  Account,
  AccountId,
  ChainId,
  Contact,
  Explorer,
  HexString,
  Signatory,
  Wallet,
} from '@renderer/shared/core';

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
  [TransactionType.XCM_LIMITED_TRANSFER]: 'crossChain',
  [TransactionType.XCM_TELEPORT]: 'crossChain',
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: 'crossChain',
  [TransactionType.POLKADOT_XCM_TELEPORT]: 'crossChain',
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: 'crossChain',
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
    return getTransactionTitle(transaction.args?.transactions?.[0]);
  }

  return TransactionTitles[transaction.type];
};

export const getModalTransactionTitle = (
  crossChain: boolean,
  transaction?: Transaction | DecodedTransaction,
): string => {
  if (!transaction) return TRANSACTION_UNKNOWN;

  if (!transaction.type) {
    return formatSectionAndMethod(transaction.section, transaction.method);
  }

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getModalTransactionTitle(crossChain, transaction.args?.transactions?.[0]);
  }

  return TransactionTitlesModal[transaction.type](crossChain);
};

export const getMultisigSignOperationTitle = (
  crossChain: boolean,
  t: TFunction,
  type?: TransactionType,
  transaction?: MultisigTransaction,
) => {
  const innerTxTitle = getModalTransactionTitle(crossChain, transaction?.transaction);

  if (type === TransactionType.MULTISIG_AS_MULTI || type === TransactionType.MULTISIG_APPROVE_AS_MULTI) {
    return `${t('operations.modalTitles.approve')} ${t(innerTxTitle)}`;
  }

  if (type === TransactionType.MULTISIG_CANCEL_AS_MULTI) {
    return `${t('operations.modalTitles.reject')} ${t(innerTxTitle)}`;
  }

  return '';
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

export const getSignatoryAccounts = (
  accounts: Account[],
  wallets: Wallet[],
  events: MultisigEvent[],
  signatories: Signatory[],
  chainId: ChainId,
): Account[] => {
  const walletsMap = new Map(wallets.map((wallet) => [wallet.id, wallet]));

  return signatories.reduce((acc: Account[], signatory) => {
    const filteredAccounts = accounts.filter(
      (a) => a.accountId === signatory.accountId && !events.some((e) => e.accountId === a.accountId),
    );

    const signatoryAccount = filteredAccounts.find((a) => {
      const isChainMatch = accountUtils.isChainIdMatch(a, chainId);
      const wallet = walletsMap.get(a.walletId);

      return isChainMatch && walletUtils.isValidSignatory(wallet);
    });

    if (signatoryAccount) {
      acc.push(signatoryAccount);
    } else {
      const legacySignatoryAccount = filteredAccounts.find(
        (a) => accountUtils.isChainAccount(a) && a.chainId === chainId,
      );
      legacySignatoryAccount && acc.push(legacySignatoryAccount);
    }

    return acc;
  }, []);
};
