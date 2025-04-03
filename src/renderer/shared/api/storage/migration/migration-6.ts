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

  const walletsToAdd: Omit<PolkadotVaultWallet, 'id' | 'accounts'>[] = [];
  const accountToDelete: string[] = [];
  const chainAccounts: ChainAccount[] = [];
  const accountsToRecreate: OldChainAccount[] = [];

  for (const account of accounts) {
    const wallet = walletsMap[account.walletId];
    if (!wallet) continue;

    const typedAccount = account as OldVaultAccount;

    if (typedAccount.type === 'universal') {
      accountToDelete.push(typedAccount.id);

      walletsToAdd.push({
        name: typedAccount.name ?? 'Polkadot Vault',
        type: WalletType.POLKADOT_VAULT,
        rootAccountId: typedAccount.accountId,
        signingType: SigningType.POLKADOT_VAULT,
        isActive: false,
      });
    } else if (typedAccount.derivationPath === '') {
      accountToDelete.push(typedAccount.id);
    } else if (typedAccount.baseAccountId === wallet.rootAccountId) {
      delete typedAccount.baseAccountId;
      chainAccounts.push(typedAccount);
    } else {
      accountsToRecreate.push(typedAccount);
    }
  }

  const walletToUpdate = wallets.map((w) => {
    // @ts-expect-error By accident wallet may contain accounts inside IndexedDB
    delete w.accounts;

    // @ts-expect-error old types
    return w.type === 'wallet_mps' ? { ...w, type: WalletType.POLKADOT_VAULT } : w;
  });

  await t.table('wallets').bulkPut(walletToUpdate);

  await t.table('accounts2').bulkDelete(accountToDelete);
  await t.table('accounts2').bulkPut(chainAccounts);
  // Remove Chain accounts, need to recreate ID
  await t.table('accounts2').bulkDelete(accountsToRecreate.map((a) => a.id));

  const walletIds = await t.table('wallets').bulkAdd(walletsToAdd, { allKeys: true });

  const newWalletsMap = new Map(walletsToAdd.map((w, i) => [w.rootAccountId, walletIds[i]]));

  const x = accountsToRecreate.map((a) => {
    const { baseAccountId: _, ...rest } = a;

    if (!a.baseAccountId) return rest;

    const walletId = newWalletsMap.get(a.baseAccountId);
    if (!walletId) return rest;

    return { ...rest, id: `${walletId} ${a.accountId} ${a.chainId}`, walletId };
  });

  await t.table('accounts2').bulkAdd(x);
}
