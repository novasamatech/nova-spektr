import { type Transaction } from 'dexie';

import { type WcAccount, AccountType, CryptoType } from '@/shared/core';
import { isEthereumAccountId } from '@/shared/lib/utils/address';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

function isWcAccount(account: Partial<AnyAccount>): account is WcAccount {
  return 'accountType' in account && account.accountType === AccountType.WALLET_CONNECT;
}

/**
 * Migration to fix cryptoType for connected EVM accounts
 */
export async function migrateEVMAccountsCryptoType(t: Transaction): Promise<void> {
  const accounts = await t.table<AnyAccount>('accounts2').toArray();

  const accountsToUpdate = accounts.filter(isWcAccount).map((account) => ({
    ...account,
    cryptoType: isEthereumAccountId(account.accountId) ? CryptoType.ETHEREUM : account.cryptoType,
  }));

  await t.table('accounts2').bulkPut(accountsToUpdate);
}
