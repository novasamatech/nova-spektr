import { Transaction } from 'dexie';

import { SigningType, WalletType, AccountType, KeyType } from '@renderer/shared/core';

/**
 * Create missing wallets for SinglePS, WOW, Multisig
 * Update Chain accounts inside Multishard
 * Add new properties to wallets and accounts
 * @param trans transactions from DB
 * @return {Promise}
 */
export const migrateWallets = async (trans: Transaction): Promise<void> => {
  const dbAccounts = await trans.table('accounts').toArray();

  await Promise.all([
    modifyExistingWallets(dbAccounts, trans),
    modifyChainAccounts(dbAccounts, trans),
    createMissingWallets(dbAccounts, trans),
    cleanAccounts(trans),
  ]);
};

const isWatchOnly = (account: any) => account.signingType === SigningType.WATCH_ONLY;
const isMultisig = (account: any) => account.signingType === SigningType.MULTISIG;
const isSingleParitySigner = (account: any) => account.signingType === SigningType.PARITY_SIGNER && !account.walletId;
const isChainAccount = (account: any) => account.signingType === SigningType.PARITY_SIGNER && account.chainId;

async function modifyExistingWallets(dbAccounts: any[], trans: Transaction): Promise<void> {
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
}

async function modifyChainAccounts(dbAccounts: any[], trans: Transaction): Promise<void> {
  await trans
    .table('accounts')
    .toCollection()
    .modify((account) => {
      if (isChainAccount(account)) {
        account.keyType = KeyType.CUSTOM;
        account.baseAccountId = account.rootId;
        account.type = AccountType.CHAIN;
      }
    });
}

async function createMissingWallets(dbAccounts: any[], trans: Transaction): Promise<void> {
  const newWallets = dbAccounts.reduce((acc, account) => {
    if (isWatchOnly(account) || isMultisig(account) || isSingleParitySigner(account)) {
      const walletType =
        (isWatchOnly(account) && WalletType.WATCH_ONLY) ||
        (isMultisig(account) && WalletType.MULTISIG) ||
        (isSingleParitySigner(account) && WalletType.SINGLE_PARITY_SIGNER);

      acc.walletParams.push({
        type: walletType,
        name: account.name,
        isActive: account.isActive,
        signingType: account.signingType,
      });
    }

    return acc;
  }, []);

  const walletsIds = await trans.table('wallets').bulkAdd(newWallets, { allKeys: true });

  let index = 0;

  await trans
    .table('accounts')
    .toCollection()
    .modify((account) => {
      if (isWatchOnly(account) || isMultisig(account) || isSingleParitySigner(account)) {
        const accountType =
          (!account.rootId && AccountType.BASE) ||
          (account.signingType === SigningType.MULTISIG && AccountType.MULTISIG) ||
          (account.chainId && AccountType.CHAIN);

        account.walletId = walletsIds[index];
        account.type = accountType;
        index++;
      }
    });
}

async function cleanAccounts(trans: Transaction): Promise<void> {
  await trans
    .table('accounts')
    .toCollection()
    .modify((account) => {
      if (!isChainAccount(account)) {
        delete account.chainId;
        delete account.derivationPath;
      }

      delete account.isMain;
      delete account.isActive;
      delete account.signingType;
      delete account.rootId;
    });
}
