import { type Transaction } from 'dexie';

import { AccountType, KeyType, SigningType, WalletType } from '@shared/core';

/**
 * Create missing wallets for SinglePS, WOW, Multisig Update
 * Chain accounts inside Multishard Add new properties to
 * wallets and accounts
 *
 * @param trans Transactions from DB
 *
 * @returns {Promise}
 */
export async function migrateWallets(trans: Transaction): Promise<void> {
  const dbAccounts = await trans.table('accounts').toArray();

  await Promise.all([modifyExistingWallets(dbAccounts, trans), createMissingWallets(dbAccounts, trans)]);

  await modifyAccounts(trans);
}

const isWatchOnly = (account: any) => account.signingType === SigningType.WATCH_ONLY;
const isMultisig = (account: any) => account.signingType === SigningType.MULTISIG;
const isSingleParitySigner = (account: any) => account.signingType === SigningType.PARITY_SIGNER && !account.walletId;
const isChainAccount = (account: any) => account.signingType === SigningType.PARITY_SIGNER && account.chainId;
const getAccountType = (account: any): AccountType => {
  return (
    (account.signingType === SigningType.MULTISIG && AccountType.MULTISIG) ||
    (!account.rootId && AccountType.BASE) ||
    (account.chainId && AccountType.CHAIN)
  );
};

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

async function createMissingWallets(dbAccounts: any[], trans: Transaction): Promise<void> {
  const { newWallets, linkedAccounts } = dbAccounts.reduce(
    (acc, account) => {
      if (isWatchOnly(account) || isMultisig(account) || isSingleParitySigner(account)) {
        const walletType =
          (isWatchOnly(account) && WalletType.WATCH_ONLY) ||
          (isMultisig(account) && WalletType.MULTISIG) ||
          (isSingleParitySigner(account) && WalletType.SINGLE_PARITY_SIGNER);

        acc.linkedAccounts.push(account);
        acc.newWallets.push({
          type: walletType,
          name: account.name,
          isActive: account.isActive,
          signingType: account.signingType,
        });
      }

      return acc;
    },
    { newWallets: [], linkedAccounts: [] },
  );

  const walletsIds = await trans.table('wallets').bulkAdd(newWallets, { allKeys: true });
  const updatedLinked = linkedAccounts.map((account: any, index: number) => {
    return {
      ...account,
      walletId: walletsIds[index],
      type: getAccountType(account),
    };
  });

  await trans.table('accounts').bulkPut(updatedLinked);
}

async function modifyAccounts(trans: Transaction): Promise<void> {
  await trans
    .table('accounts')
    .toCollection()
    .modify((account) => {
      if (isChainAccount(account)) {
        account.keyType = KeyType.CUSTOM;
        account.baseId = account.rootId;
        account.type = AccountType.CHAIN;
      } else {
        account.type = account.type || AccountType.BASE;
        delete account.chainId;
        delete account.derivationPath;
      }

      delete account.isMain;
      delete account.isActive;
      delete account.signingType;
      delete account.rootId;
    });
}
