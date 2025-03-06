import { type Transaction } from 'dexie';

import { type MultisigAccount, type MultisigWallet, type Wallet } from '@/shared/core';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

/**
 * Migrate multisig accounts to multichain format
 *
 * @param trans Transactions from DB
 *
 * @returns {Promise}
 */
export async function migrateMultisigAccounts(t: Transaction): Promise<void> {
  const accounts = await t.db.table<AnyAccount>('accounts2').toArray();
  const wallets = await t.db.table<Wallet>('wallets').toArray();

  const multisigWallets = wallets.filter((w) => w.type === 'wallet_ms') as MultisigWallet[];
  const walletsToDelete: Wallet[] = [];
  const accountsToAdd: AnyAccount[] = [];
  const accountsToDelete: AnyAccount[] = [];

  const existingAccounts = new Set<string>();

  for (const wallet of multisigWallets) {
    const walletAccounts = accounts
      .filter((a): a is MultisigAccount => 'accountType' in a && a.accountType === 'multisig')
      .filter((a) => a.walletId === wallet.id);

    if (!walletAccounts.length) {
      walletsToDelete.push(wallet);
      continue;
    }

    for (const walletAccount of walletAccounts) {
      const name = `${walletAccount.threshold}-${walletAccount.signatories
        .map((s) => s.accountId)
        .sort()
        .join(',')}`;

      if (existingAccounts.has(name)) {
        walletsToDelete.push(wallet);
        accountsToDelete.push(walletAccount);
        continue;
      }

      const id = `${walletAccount.walletId} ${walletAccount.accountId} universal`;

      existingAccounts.add(name);

      // @ts-expect-error no address in types
      const signatories = walletAccount.signatories.map(({ address: _, ...rest }) => rest);

      const newAccount: MultisigAccount = {
        ...walletAccount,
        id,
        type: 'universal',
        signatories,
      };

      // @ts-expect-error to chainId in type
      delete newAccount['chainId'];

      accountsToAdd.push(newAccount);
      accountsToDelete.push(walletAccount);
    }
  }

  await t.table('accounts2').bulkDelete(accountsToDelete.map((a) => a.id));
  await t.table('accounts2').bulkPut(accountsToAdd);
  await t.table('wallets').bulkDelete(walletsToDelete.map((w) => w.id));
}
