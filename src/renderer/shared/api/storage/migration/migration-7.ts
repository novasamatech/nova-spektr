import { type Transaction } from 'dexie';

import { CryptoType } from '@/shared/core';
import { isEthereumAccountId } from '@/shared/lib/utils/address';
import { type AnyAccount } from '@/domains/network';

/**
 * Migration to fix cryptoType for connected EVM accounts
 */
export async function migrateEVMAccountsCryptoType(t: Transaction): Promise<void> {
  const accounts = await t.table<AnyAccount>('accounts2').toArray();

  console.log('migrateEVMAccountsCryptoType', { accounts });

  const accountsToUpdate = accounts.map((account) => ({
    ...account,
    cryptoType: isEthereumAccountId(account.accountId) ? CryptoType.ETHEREUM : account.cryptoType,
  }));

  await t.table('accounts2').bulkPut(accountsToUpdate);
}
