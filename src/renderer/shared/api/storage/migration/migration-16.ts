import { type Transaction } from 'dexie';

import { AccountType, type ProxyType } from '@/shared/core';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

type OldFlexMultisigAccount = AnyAccount & {
  accountType: AccountType.FLEX_MULTISIG;
  multisigAccountId: string;
  chainId: string;
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

type NewFlexMultisigAccount = OldFlexMultisigAccount & {
  connections: {
    proxyAccountId: string;
    proxyType: ProxyType;
    delay: number;
  }[];
};

/**
 * Migration to add connections field to FlexibleMultisigAccount by looking up the
 * corresponding ProxiedAccount and getting the connection info from its connections.
 */
export async function addFlexibleMultisigConnections(t: Transaction): Promise<void> {
  const accounts = await t.table<AnyAccount>('accounts2').toArray();

  const flexMultisigAccounts = accounts.filter(
    (account): account is OldFlexMultisigAccount =>
      'accountType' in account && account.accountType === AccountType.FLEX_MULTISIG && !('connections' in account),
  );

  if (flexMultisigAccounts.length === 0) {
    return;
  }

  const proxiedAccounts = accounts.filter(
    (account): account is ProxiedAccountType => 'accountType' in account && account.accountType === AccountType.PROXIED,
  );

  const updatedAccounts = flexMultisigAccounts.map((flexAccount): NewFlexMultisigAccount => {
    // Find the ProxiedAccount with the same accountId and chainId
    const proxiedAccount = proxiedAccounts.find(
      (p) => p.accountId === flexAccount.accountId && p.chainId === flexAccount.chainId,
    );

    // Get the connection from the proxied account that matches our multisig
    const matchingConnection = proxiedAccount?.connections.find(
      (c) => c.proxyAccountId === flexAccount.multisigAccountId,
    );

    // Create the connections array
    const connections = matchingConnection
      ? [matchingConnection]
      : [
          {
            proxyAccountId: flexAccount.multisigAccountId,
            proxyType: 'Any' as ProxyType,
            delay: 0,
          },
        ];

    return {
      ...flexAccount,
      connections,
    };
  });

  if (updatedAccounts.length > 0) {
    await t.table('accounts2').bulkPut(updatedAccounts);
  }
}
