import { type Transaction } from 'dexie';
import uniqBy from 'lodash/uniqBy';

import {
  type BaseAccount,
  type PolkadotVaultWallet,
  SigningType,
  type SingleShardWallet,
  type VaultChainAccount,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, type ChainAccount } from '@/domains/network';

type OldChainAccount = VaultChainAccount & { baseAccountId?: AccountId };
type OldVaultAccount = BaseAccount | OldChainAccount;

/**
 * Convert all Multishard wallets to PolkadotVault or SingleShard wallets
 *
 * @param t Transactions from DB
 *
 * @returns {Promise}
 */
export async function migrateMultishardAccounts(t: Transaction): Promise<void> {
  await removeRedundantAccounts(t);

  const { toWallet, toRegroup, toUpdate, toDelete } = await getWalletsAndAccounts(t);

  await t.table('accounts2').bulkDelete(toDelete);
  await t.table('accounts2').bulkPut(toUpdate);

  const toWalletValues = Array.from(toWallet.values());
  const walletIds = await t.table('wallets').bulkAdd(toWalletValues, { allKeys: true });

  const walletIdsMap = new Map(toWalletValues.map((w, i) => [w.rootAccountId, walletIds[i]]));

  const newAccounts = Array.from(toRegroup).flatMap(([baseAccountId, accounts]) => {
    const walletId = walletIdsMap.get(baseAccountId);
    if (!walletId) return accounts;

    return accounts.map((a) => ({
      ...a,
      walletId,
      id: `${walletId} ${a.accountId} ${a.chainId}`,
    }));
  });

  await t.table('accounts2').bulkAdd(newAccounts);
}

async function removeRedundantAccounts(t: Transaction) {
  const wallets = await t.db.table<Wallet>('wallets').toArray();

  const walletToUpdate = wallets.map((w) => {
    // @ts-expect-error By accident wallet may contain accounts inside IndexedDB
    delete w.accounts;

    // @ts-expect-error old types
    return w.type === 'wallet_mps' ? { ...w, type: WalletType.POLKADOT_VAULT } : w;
  });

  await t.table('wallets').bulkPut(walletToUpdate);
}

async function getWalletsAndAccounts(t: Transaction) {
  const accounts = await t.db.table<AnyAccount>('accounts2').toArray();
  const wallets = await t.db.table<Wallet>('wallets').toArray();

  const walletsMap = new Map(
    // @ts-expect-error old types
    wallets.filter((w) => w.type === 'wallet_mps').map((w) => [w.id, w as PolkadotVaultWallet]),
  );

  // Drafts that require more details to become PV or SS
  const toDraftWallet = new Map<AccountId, BaseAccount>();
  // Will become new wallets
  const toWallet = new Map<AccountId, PolkadotVaultWallet | SingleShardWallet>();
  // Move to new wallets
  const toRegroup = new Map<AccountId, OldChainAccount[]>();
  // Delete "baseAccountId"
  const toUpdate: ChainAccount[] = [];
  // Empty derivation path
  const toDelete: string[] = [];

  for (const account of accounts) {
    const wallet = walletsMap.get(account.walletId);
    if (!wallet) continue;

    const typedAccount = account as OldVaultAccount;

    if (typedAccount.type === 'universal') {
      toDelete.push(typedAccount.id);
      if (toDraftWallet.has(typedAccount.accountId)) continue;

      toDraftWallet.set(typedAccount.accountId, typedAccount);

      // Vault Chain account:
    } else if (typedAccount.baseAccountId === wallet.rootAccountId) {
      delete typedAccount.baseAccountId;
      toUpdate.push(typedAccount);

      // Multishard Chain account:
    } else {
      toDelete.push(typedAccount.id);

      const regroup = toRegroup.get(typedAccount.baseAccountId!) || [];
      toRegroup.set(typedAccount.baseAccountId!, regroup.concat(typedAccount));
      delete typedAccount.baseAccountId;
    }
  }

  for (const [accountId, accounts] of toRegroup.entries()) {
    toRegroup.set(accountId, uniqBy(accounts, ['accountId', 'chainId']));
  }

  for (const [accountId, account] of toDraftWallet.entries()) {
    const regroup = toRegroup.get(accountId) || [];
    const hasDerivedAccounts = regroup.filter((a) => a.derivationPath).length > 0;

    // Polkadot Vault
    if (hasDerivedAccounts) {
      toWallet.set(accountId, {
        name: account.name ?? 'Polkadot Vault',
        type: WalletType.POLKADOT_VAULT,
        rootAccountId: account.accountId,
        signingType: SigningType.POLKADOT_VAULT,
        isActive: false,
      } as PolkadotVaultWallet);

      // Singleshard
    } else {
      toWallet.set(accountId, {
        name: account.name ?? 'Polkadot Singleshard',
        type: WalletType.SINGLE_PARITY_SIGNER,
        rootAccountId: account.accountId,
        signingType: SigningType.PARITY_SIGNER,
        isActive: false,
      } as SingleShardWallet);
    }
  }

  return {
    toWallet,
    toDelete,
    toUpdate,
    toRegroup,
  };
}
