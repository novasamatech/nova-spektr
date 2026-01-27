import { type Transaction } from 'dexie';

import { type ProxyType, type ProxyVariant, type Wallet, AccountType } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, type ChainAccount } from '@/domains/network';

interface DeprecatedProxiedAccount extends ChainAccount {
  accountType: AccountType.PROXIED;
  proxyAccountId: AccountId;
  delay: number;
  proxyType: ProxyType;
  proxyVariant: ProxyVariant;
  blockNumber?: number;
  extrinsicIndex?: number;
}

function isDeprecatedProxiedAccount(account: AnyAccount): account is DeprecatedProxiedAccount {
  return (
    account.type === 'chain' &&
    'accountType' in account &&
    account.accountType === AccountType.PROXIED &&
    'proxyAccountId' in account
  );
}

/**
 * Migration to remove DeprecatedProxiedAccount entities
 */
export async function removeDeprecatedProxiedAccounts(t: Transaction): Promise<void> {
  const accounts = await t.table<AnyAccount>('accounts2').toArray();
  const wallets = await t.table<Wallet>('wallets').toArray();

  const deprecatedAccounts = accounts.filter(isDeprecatedProxiedAccount);

  if (deprecatedAccounts.length === 0) {
    return;
  }

  const accountIdsToDelete = deprecatedAccounts.map((deprecatedAccount) => deprecatedAccount.id);
  const walletIdsToDelete = deprecatedAccounts
    .map((account) => wallets.find((wallet) => wallet.id === account.walletId)?.id)
    .filter(nonNullable);

  await t.table('accounts2').bulkDelete(accountIdsToDelete);
  await t.table('wallets').bulkDelete(walletIdsToDelete);
}
