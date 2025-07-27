import { type Transaction } from 'dexie';

import { AccountType, type ProxiedAccount, type ProxiedConnection, type Wallet } from '@/shared/core';
import { type DeprecatedProxiedAccount } from '@/shared/core/types/account';
// eslint-disable-next-line boundaries/element-types
import { nonNullable } from '@/shared/lib/utils';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

function isDeprecatedProxiedAccount(account: AnyAccount): account is DeprecatedProxiedAccount {
  return (
    account.type === 'chain' &&
    'accountType' in account &&
    account.accountType === AccountType.PROXIED &&
    'proxyAccountId' in account
  );
}

/**
 * Migration to convert DeprecatedProxiedAccount to ProxiedAccount format and
 * merge accounts with same accountId and chainId
 */
export async function migrateProxiedAccountsFormat(t: Transaction): Promise<void> {
  const accounts = await t.table<AnyAccount>('accounts2').toArray();
  const wallets = await t.table<Wallet>('wallets').toArray();

  const deprecatedAccounts = accounts.filter(isDeprecatedProxiedAccount);
  console.log('migrateProxiedAccountsFormat', { deprecatedAccounts, wallets });

  if (deprecatedAccounts.length === 0) {
    return;
  }

  // Group deprecated accounts by accountId + chainId
  const groupedAccounts = new Map<string, DeprecatedProxiedAccount[]>();

  for (const account of deprecatedAccounts) {
    const key = `${account.accountId}-${account.chainId}`;
    if (!groupedAccounts.has(key)) {
      groupedAccounts.set(key, []);
    }
    groupedAccounts.get(key)!.push(account);
  }

  const newAccounts = Array.from(groupedAccounts.values()).map((accountGroup) => {
    const firstAccount = accountGroup[0];

    const connections: ProxiedConnection[] = accountGroup.map((account) => ({
      proxyAccountId: account.proxyAccountId,
      delay: account.delay,
      proxyType: account.proxyType,
      proxyVariant: account.proxyVariant,
      blockNumber: account.blockNumber,
      extrinsicIndex: account.extrinsicIndex,
    }));

    return {
      id: firstAccount.id,
      type: 'chain',
      name: firstAccount.name,
      accountId: firstAccount.accountId,
      walletId: firstAccount.walletId,
      accountType: AccountType.PROXIED,
      chainId: firstAccount.chainId,
      cryptoType: firstAccount.cryptoType,
      signingType: firstAccount.signingType,
      connections,
    } satisfies ProxiedAccount;
  });

  const accountsToDelete = deprecatedAccounts.filter(
    (deprecatedAccount) => !newAccounts.some((newAcc) => newAcc.id === deprecatedAccount.id),
  );
  const walletsToDelete = accountsToDelete
    .map((account) => wallets.find((wallet) => wallet.id === account.walletId))
    .filter(nonNullable);

  console.log('migrateProxiedAccountsFormat', { newAccounts, accountsToDelete, walletsToDelete });
  await t.table('accounts2').bulkDelete(deprecatedAccounts.map((a) => a.id));
  await t.table('wallets').bulkDelete(walletsToDelete.map((w) => w.id));
  await t.table('accounts2').bulkPut(newAccounts);
}
