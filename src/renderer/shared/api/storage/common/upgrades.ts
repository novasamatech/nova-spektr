import { Transaction } from 'dexie';

import { MultisigEventDS } from './types';
import { SigningType, WalletType, AccountType, KeyType } from '@renderer/shared/core';

/**
 * Remove events from MultisigTransactions
 * Add events to separate table MultisigEvents
 * @param trans transactions from DB
 * @return {Promise}
 */
export const upgradeEvents = async (trans: Transaction): Promise<any> => {
  const txs = await trans.table('multisigTransactions').toArray();
  const newEvents = txs
    .map((tx) =>
      tx.events.map((e: MultisigEventDS) => ({
        ...e,
        txAccountId: tx.accountId,
        txChainId: tx.chainId,
        txCallHash: tx.callHash,
        txBlock: tx.blockCreated,
        txIndex: tx.indexCreated,
      })),
    )
    .flat();

  return Promise.all([
    trans
      .table('multisigTransactions')
      .toCollection()
      .modify((tx) => {
        delete tx.events;
      }),
    trans.table('multisigEvents').bulkAdd(newEvents),
  ]);
};

/**
 * Create missing wallets for SinglePS, WOW, Multisig
 * Add new properties to wallets and accounts
 * @param trans transactions from DB
 * @return {Promise}
 */
export const upgradeWallets = async (trans: Transaction): Promise<any> => {
  const dbAccounts = await trans.table('accounts').toArray();

  return Promise.all([modifyExistingWallets(dbAccounts, trans), createMissingWallets(dbAccounts, trans)]);
};

const modifyExistingWallets = async (dbAccounts: any[], trans: Transaction): Promise<void> => {
  const activeAccount = dbAccounts.find((account) => account.isActive);

  await trans
    .table('wallets')
    .toCollection()
    .modify((wallet) => {
      const isWatchOnly = wallet.type === WalletType.WATCH_ONLY;
      const isMultisig = wallet.type === WalletType.MULTISIG;
      const isParitySigner =
        wallet.type === WalletType.SINGLE_PARITY_SIGNER || wallet.type === WalletType.MULTISHARD_PARITY_SIGNER;

      wallet.isActive = activeAccount?.walletId === wallet.id;
      wallet.signingType =
        (isWatchOnly && SigningType.WATCH_ONLY) ||
        (isMultisig && SigningType.MULTISIG) ||
        (isParitySigner && SigningType.PARITY_SIGNER);
    });
};

const createMissingWallets = async (dbAccounts: any[], trans: Transaction): Promise<void> => {
  const { walletParams, accounts } = dbAccounts.reduce(
    (acc, account) => {
      const isWatchOnly = account.signingType === SigningType.WATCH_ONLY;
      const isMultisig = account.signingType === SigningType.MULTISIG;
      const isChainAccount = account.signingType === SigningType.PARITY_SIGNER && account.chainId;
      const isSingleParitySigner = account.signingType === SigningType.PARITY_SIGNER && !account.walletId;

      if (isWatchOnly || isMultisig || isSingleParitySigner) {
        const walletType =
          (isWatchOnly && WalletType.WATCH_ONLY) ||
          (isMultisig && WalletType.MULTISIG) ||
          (isSingleParitySigner && WalletType.SINGLE_PARITY_SIGNER);

        acc.accounts.push(account);
        acc.walletParams.push({
          type: walletType,
          name: account.name,
          isActive: account.isActive,
          signingType: account.signingType,
        });
      } else if (isChainAccount) {
        acc.accounts.push(account);
      }

      return acc;
    },
    { walletParams: [], accounts: [] },
  );

  const walletsIds = await trans.table('wallets').bulkAdd(walletParams, { allKeys: true });
  const updatedAccounts = accounts.map((account: any, index: number) => {
    const accountType =
      (!account.rootId && AccountType.BASE) ||
      (account.signingType === SigningType.MULTISIG && AccountType.MULTISIG) ||
      (account.chainId && AccountType.CHAIN);

    return {
      ...account,
      ...(account.chainId && { keyType: KeyType.CUSTOM }),
      baseAccountId: account.rootId,
      walletId: walletsIds[index],
      type: accountType,
    };
  });

  await trans.table('accounts').bulkPut(updatedAccounts);
  await trans
    .table('accounts')
    .toCollection()
    .modify((account) => {
      if (account.baseAccountId === undefined) delete account.baseAccountId;
      if (account.chainId === undefined) delete account.chainId;
      if (account.derivationPath === undefined) delete account.derivationPath;

      delete account.isMain;
      delete account.isActive;
      delete account.rootId;
      delete account.signingType;
    });
};
