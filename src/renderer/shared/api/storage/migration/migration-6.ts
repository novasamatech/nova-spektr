import { type Transaction } from 'dexie';

import { type PolkadotVaultWallet, SigningType, type Wallet, WalletType } from '@/shared/core';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, type ChainAccount, type UniversalAccount } from '@/domains/network';

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

  // @ts-expect-error old types
  const walletsMap = new Set(wallets.filter((w) => w.type === 'multishard').map((w) => w.id));

  const walletsToAdd: Omit<PolkadotVaultWallet, 'id'>[] = [];
  const accountsToDelete: UniversalAccount[] = [];
  const accountsToUpdate: ChainAccount[] = [];

  for (const account of accounts) {
    if (!walletsMap.has(account.walletId)) continue;

    if (account.type === 'universal') {
      accountsToDelete.push(account);

      walletsToAdd.push({
        name: account.name ?? 'Polkadot Vault',
        type: WalletType.POLKADOT_VAULT,
        rootAccountId: account.accountId,
        isHidden: false,
        isActive: false,
        accounts: [],
        signingType: SigningType.POLKADOT_VAULT,
      });
    } else {
      // Remove redundant property
      // @ts-expect-error old types
      delete account.baseAccountId;
      accountsToUpdate.push(account);
    }
  }

  await t.table('accounts2').bulkDelete(accountsToDelete.map((a) => a.id));
  const walletIds = await t.table('wallets').bulkAdd(walletsToAdd, { allKeys: true });

  for (const [index, wallet] of walletsToAdd.entries()) {
    for (const account of accountsToUpdate) {
      if (account.accountId !== wallet.rootAccountId) continue;

      account.walletId = walletIds[index];
    }
  }

  await t.table('accounts2').bulkPut(accountsToUpdate);
}
