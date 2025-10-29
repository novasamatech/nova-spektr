import { type Transaction } from 'dexie';

import { type VaultChainAccount } from '@/shared/core';
import { RelayChains, nullable } from '@/shared/lib/utils';

const RELAY_CHAINS = [RelayChains.POLKADOT, RelayChains.KUSAMA, RelayChains.WESTEND, RelayChains.ROCOCO];

/**
 * Migration to remove duplicate polkadot vault derivations
 */
export async function migrateDuplicateVaultDerivations(t: Transaction): Promise<void> {
  const accounts = await t.table<VaultChainAccount>('accounts2').toArray();
  const seen = new Map<string, VaultChainAccount>();
  const accountIdsToRemove: string[] = [];

  for (const account of accounts) {
    if (nullable(account.derivationPath)) continue;

    const uniqKey = account.walletId + account.accountId + account.derivationPath;
    const existing = seen.get(uniqKey);

    if (existing) {
      if (RELAY_CHAINS.includes(account.chainId)) {
        accountIdsToRemove.push(existing.id);
        seen.set(uniqKey, account);
      } else {
        accountIdsToRemove.push(account.id);
      }
    } else {
      seen.set(uniqKey, account);
    }
  }

  await t.table('accounts2').bulkDelete(accountIdsToRemove);
}
