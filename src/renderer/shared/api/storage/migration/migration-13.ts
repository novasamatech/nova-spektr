import { type Transaction } from 'dexie';

import { AccountType } from '@/shared/core';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

/**
 * Migration to rename blockNumber to entropyBlockNumber for ProxiedAccount and
 * FlexibleMultisigAccount
 */
export async function renameBlockNumberToEntropyBlockNumber(t: Transaction): Promise<void> {
  const accounts = await t.table<AnyAccount>('accounts2').toArray();

  const accountsToUpdate = accounts
    .filter((account) => {
      if (!('accountType' in account)) return false;
      return account.accountType === AccountType.PROXIED || account.accountType === AccountType.FLEX_MULTISIG;
    })
    .filter((account) => 'blockNumber' in account && account.blockNumber !== undefined);

  if (accountsToUpdate.length === 0) {
    return;
  }

  const updatedAccounts = accountsToUpdate.map((account) => {
    const { blockNumber, ...rest } = account as any;

    return {
      ...rest,
      entropyBlockNumber: blockNumber,
    };
  });

  await t.table('accounts2').bulkPut(updatedAccounts);
}
