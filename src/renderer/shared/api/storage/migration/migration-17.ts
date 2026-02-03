import { type Transaction } from 'dexie';

// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

export async function addAccountCreatedAt(t: Transaction): Promise<void> {
  const accounts = await t.table<AnyAccount>('accounts2').toArray();
  const accountsWithoutCreatedAt = accounts.filter(
    (account) => account.createdAt === null || account.createdAt === undefined,
  );

  if (accountsWithoutCreatedAt.length === 0) {
    return;
  }

  const updatedAccounts = accountsWithoutCreatedAt.map((account) => ({
    ...account,
    createdAt: Date.now(),
  }));

  await t.table('accounts2').bulkPut(updatedAccounts);
}
