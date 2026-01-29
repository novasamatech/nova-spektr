import { type Transaction } from 'dexie';

import { type ProxyType, AccountType } from '@/shared/core';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

type FlexMultisigAccount = AnyAccount & {
  accountType: AccountType.FLEX_MULTISIG;
  multisigAccountId: string;
  chainId: string;
  proxyType?: ProxyType;
};

type ProxiedAccountType = AnyAccount & {
  accountType: AccountType.PROXIED;
  chainId: string;
  connections: {
    proxyAccountId: string;
    proxyType: ProxyType;
    delay: number;
  }[];
};

/**
 * Migration to add proxyType field to FlexibleMultisigAccount by looking up the
 * corresponding ProxiedAccount and getting the proxyType from its connections.
 */
export async function addFlexibleMultisigProxyType(t: Transaction): Promise<void> {
  const accounts = await t.table<AnyAccount>('accounts2').toArray();

  const flexMultisigAccounts = accounts.filter(
    (account): account is FlexMultisigAccount =>
      'accountType' in account && account.accountType === AccountType.FLEX_MULTISIG && !('proxyType' in account),
  );

  if (flexMultisigAccounts.length === 0) {
    return;
  }

  const proxiedAccounts = accounts.filter(
    (account): account is ProxiedAccountType => 'accountType' in account && account.accountType === AccountType.PROXIED,
  );

  const updatedAccounts = flexMultisigAccounts
    .map((flexAccount) => {
      // Find the ProxiedAccount with the same accountId and chainId
      const proxiedAccount = proxiedAccounts.find(
        (p) => p.accountId === flexAccount.accountId && p.chainId === flexAccount.chainId,
      );

      if (!proxiedAccount) {
        // Fallback to 'Any' if no proxied account found (shouldn't happen)
        return {
          ...flexAccount,
          proxyType: 'Any' as ProxyType,
        };
      }

      // Find the connection where proxyAccountId matches the multisigAccountId
      const connection = proxiedAccount.connections.find((c) => c.proxyAccountId === flexAccount.multisigAccountId);

      return {
        ...flexAccount,
        proxyType: connection?.proxyType ?? ('Any' as ProxyType),
      };
    })
    .filter((account) => account.proxyType !== undefined);

  if (updatedAccounts.length > 0) {
    await t.table('accounts2').bulkPut(updatedAccounts);
  }
}
