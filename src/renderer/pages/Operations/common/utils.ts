import { TFunction } from 'react-i18next';

import { accountUtils, walletUtils } from '@entities/wallet';
import { formatSectionAndMethod, toAddress } from '@shared/lib/utils';
import { TransferTypes, XcmTypes, isProxyTransaction } from '@entities/transaction';
import {
  Account_NEW,
  AccountId,
  ChainId,
  Contact,
  Explorer,
  HexString,
  Signatory,
  Wallet_NEW,
  Address,
  ProxyType,
  Chain,
} from '@shared/core';
import {
  DecodedTransaction,
  MultisigEvent,
  MultisigTransaction,
  Transaction,
  TransactionType,
} from '@entities/transaction/model/transaction';

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
};

export const getTransactionTitle = (transaction?: Transaction | DecodedTransaction): string => {
  if (!transaction) return TRANSACTION_UNKNOWN;

  if (!transaction.type) {
    return formatSectionAndMethod(transaction.section, transaction.method);
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
  transaction?: Transaction | DecodedTransaction,
): string => {
  if (!transaction) return TRANSACTION_UNKNOWN;

  if (!transaction.type) {
    return formatSectionAndMethod(transaction.section, transaction.method);
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
  const innerTxTitle = getModalTransactionTitle(crossChain, transaction?.transaction);

  if (type === TransactionType.MULTISIG_AS_MULTI || type === TransactionType.MULTISIG_APPROVE_AS_MULTI) {
    return `${t('operations.modalTitles.approve')} ${t(innerTxTitle)}`;
  }

  if (type === TransactionType.MULTISIG_CANCEL_AS_MULTI) {
    return `${t('operations.modalTitles.reject')} ${t(innerTxTitle)}`;
  }

  return '';
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
  if (txType === TransactionType.PROXY) {
    const transaction = tx.args?.transaction;
    if (!transaction) return null;

    return getTransactionAmount(transaction);
  }

  return null;
};

export const getSignatoryName = (
  signatoryId: AccountId,
  txSignatories: Signatory[],
  contacts: Contact[],
  wallets: Wallet_NEW[],
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

  const accounts = wallets.map((wallet) => wallet.accounts).flat();
  const fromAccount = finderFn(accounts)?.name;
  if (fromAccount) return fromAccount;

  return toAddress(signatoryId, { chunk: 5, prefix: addressPrefix });
};

export const getSignatoryAccounts = (
  accounts: Account_NEW[],
  wallets: Wallet_NEW[],
  events: MultisigEvent[],
  signatories: Signatory[],
  chainId: ChainId,
): Account_NEW[] => {
  const walletsMap = new Map(wallets.map((wallet) => [wallet.id, wallet]));

  return signatories.reduce((acc: Account_NEW[], signatory) => {
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

export const getDestination = (
  tx: MultisigTransaction,
  chains: Record<ChainId, Chain>,
  destinationChain?: ChainId,
): Address | undefined => {
  if (!tx.transaction) return undefined;

  const chain = destinationChain ? chains[destinationChain] : chains[tx.transaction.chainId];

  if (isProxyTransaction(tx.transaction)) {
    return toAddress(tx.transaction.args.transaction.args.dest, { prefix: chain.addressPrefix });
  }

  return toAddress(tx.transaction.args.dest, { prefix: chain.addressPrefix });
};

export const getPayee = (tx: MultisigTransaction): { Account: Address } | string | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction.args.payee;
  }

  return tx.transaction.args.payee;
};

export const getDelegate = (tx: MultisigTransaction): Address | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction.args.delegate;
  }

  return tx.transaction.args.delegate;
};

export const getDestinationChain = (tx: MultisigTransaction): ChainId | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction.args.destinationChain;
  }

  return tx.transaction.args.destinationChain;
};

export const getSender = (tx: MultisigTransaction): Address | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction.real;
  }

  return tx.transaction.address;
};

export const getSpawner = (tx: MultisigTransaction): AccountId | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction.args.spawner;
  }

  return tx.transaction.args.spawner;
};

export const getProxyType = (tx: MultisigTransaction): ProxyType | undefined => {
  if (!tx.transaction) return undefined;

  if (isProxyTransaction(tx.transaction)) {
    return tx.transaction.args.transaction.args.proxyType;
  }

  return tx.transaction.args.proxyType;
};
