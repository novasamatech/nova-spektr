import { type Transaction } from 'dexie';

import { type Wallet } from '@/shared/core';
import { groupBy } from '@/shared/lib/utils';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

const PV_WALLETS = ['wallet_pv', 'wallet_mps', 'wallet_sps'];

/**
 * Simplify PV wallets to contain BaseAccount, ChainAccount and ShardAccount
 *
 * @param t Transactions from DB
 *
 * @returns {Promise}
 */
export async function migratePVAccounts(t: Transaction): Promise<void> {
  const accounts = await t.db.table<AnyAccount>('accounts2').toArray();
  const wallets = await t.db.table<Wallet>('wallets').toArray();

  const groupedAccounts = groupBy(accounts, (a) => a.walletId);
  let accountsToDelete: AnyAccount[] = [];
  let accountsToUpdate: AnyAccount[] = [];
  const walletsToUpdate: Wallet[] = [];

  for (const [walletId, group] of Object.entries(groupedAccounts)) {
    if (!group) continue;
    const wallet = wallets.find((w) => w.id.toString() === walletId);
    if (!wallet) {
      // delete accounts with missing wallets
      accountsToDelete = accountsToDelete.concat(group);
      continue;
    }

    if (!PV_WALLETS.includes(wallet.type)) continue;

    const baseAccount = group.find((a) => 'accountType' in a && a.accountType === 'base');

    // delete base account if wallet has other accounts
    if (group.length > 1 && baseAccount) {
      accountsToDelete.push(baseAccount);
    } else {
      accountsToUpdate = accountsToUpdate.concat(
        group.map((account) => ({
          ...account,
          name: wallet.name,
        })),
      );
    }

    // add baseAccountId to wallet
    if (baseAccount) {
      walletsToUpdate.push({
        ...wallet,
        // @ts-expect-error unkown wallet type
        rootAccountId: baseAccount.accountId,
      });
    }
  }

  await t.table('accounts2').bulkDelete(accountsToDelete.map((a) => a.id));
  await t.table('accounts2').bulkPut(accountsToUpdate);
  await t.table('wallets').bulkPut(walletsToUpdate);
}
