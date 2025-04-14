import { type Transaction } from 'dexie';

import {
  type PolkadotVaultWallet,
  SigningType,
  type VaultBaseAccount,
  type VaultChainAccount,
  type Wallet,
  WalletType,
} from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, type ChainAccount } from '@/domains/network';

type OldChainAccount = VaultChainAccount & { baseAccountId?: AccountId };
type OldVaultAccount = VaultBaseAccount | OldChainAccount;

/**
 * Convert all Multishard wallets to PV wallets
 *
 * @param t Transactions from DB
 *
 * @returns {Promise}
 */
export async function migrateMultishardAccounts(t: Transaction): Promise<void> {
  const accounts = await t.db.table<AnyAccount>('accounts2').toArray();
  const wallets = await t.db.table<Wallet>('wallets').toArray();

  const walletsMap = dictionary(
    // @ts-expect-error old types
    wallets.filter((w) => w.type === 'wallet_mps'),
    'id',
    (w) => w as PolkadotVaultWallet,
  );

  const walletsToAdd = new Map<AccountId, Omit<PolkadotVaultWallet, 'id' | 'accounts'>>();
  const accountsToDelete: string[] = [];
  const accountsToUpdate: ChainAccount[] = [];
  const accountsToRecreate = new Map<AccountId, OldChainAccount>();

  for (const account of accounts) {
    const wallet = walletsMap[account.walletId];
    if (!wallet) continue;

    const typedAccount = account as OldVaultAccount;

    if (typedAccount.type === 'universal') {
      accountsToDelete.push(typedAccount.id);
      if (walletsToAdd.has(typedAccount.accountId)) continue;

      walletsToAdd.set(typedAccount.accountId, {
        name: typedAccount.name ?? 'Polkadot Vault',
        type: WalletType.POLKADOT_VAULT,
        rootAccountId: typedAccount.accountId,
        signingType: SigningType.POLKADOT_VAULT,
        isActive: false,
      });
    } else if (typedAccount.derivationPath === '') {
      accountsToDelete.push(typedAccount.id);
    } else if (typedAccount.baseAccountId === wallet.rootAccountId) {
      delete typedAccount.baseAccountId;
      accountsToUpdate.push(typedAccount);
    } else {
      // Same account can be in another wallet, remove the duplicate
      if (accountsToRecreate.has(typedAccount.accountId)) {
        accountsToDelete.push(typedAccount.id);
      }

      accountsToRecreate.set(typedAccount.accountId, typedAccount);
    }
  }

  const walletToUpdate = wallets.map((w) => {
    // @ts-expect-error By accident wallet may contain accounts inside IndexedDB
    delete w.accounts;

    // @ts-expect-error old types
    return w.type === 'wallet_mps' ? { ...w, type: WalletType.POLKADOT_VAULT } : w;
  });

  await t.table('wallets').bulkPut(walletToUpdate);

  await t.table('accounts2').bulkDelete(accountsToDelete);
  await t.table('accounts2').bulkPut(accountsToUpdate);

  // Remove Chain accounts, need to recreate ID
  const accountsToRecreateValues = Array.from(accountsToRecreate.values());
  await t.table('accounts2').bulkDelete(accountsToRecreateValues.map((a) => a.id));

  const walletsToAddValues = Array.from(walletsToAdd.values());
  const walletIds = await t.table('wallets').bulkAdd(walletsToAddValues, { allKeys: true });

  const newWalletsMap = new Map(walletsToAddValues.map((w, i) => [w.rootAccountId, walletIds[i]]));

  const newAccounts = accountsToRecreateValues.map((a) => {
    const { baseAccountId: _, ...rest } = a;

    if (!a.baseAccountId) return rest;

    const walletId = newWalletsMap.get(a.baseAccountId);
    if (!walletId) return rest;

    return { ...rest, id: `${walletId} ${a.accountId} ${a.chainId}`, walletId };
  });

  await t.table('accounts2').bulkAdd(newAccounts);
}
