import { type Transaction } from 'dexie';

import { AccountNameType } from '@/shared/core';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

export async function addAccountNameType(t: Transaction): Promise<void> {
  const accounts = await t.table<AnyAccount>('accounts2').toArray();
  const accountsWithoutNameType = accounts.filter((account) => account.nameType === undefined);

  if (accountsWithoutNameType.length === 0) {
    return;
  }

  const updatedAccounts = accountsWithoutNameType.map((account) => ({
    ...account,
    nameType: AccountNameType.CUSTOM,
  }));

  await t.table('accounts2').bulkPut(updatedAccounts);
}
