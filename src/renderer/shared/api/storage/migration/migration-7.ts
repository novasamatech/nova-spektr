import { type Transaction } from 'dexie';

import { type ProxyAccount } from '@/shared/core';

/**
 * Remove duplicate proxy entries from the proxies table. This migration
 * addresses the issue where proxyModel.populate() was called without await,
 * potentially causing race conditions and duplicate entries
 *
 * @param t Transaction from DB
 *
 * @returns {Promise}
 */
export async function migrateProxyDuplicates(t: Transaction): Promise<void> {
  const proxies = await t.table<ProxyAccount>('proxies').toArray();

  // Group proxies by their unique combination of properties
  const proxyGroups = new Map<string, ProxyAccount[]>();

  for (const proxy of proxies) {
    // Create a unique key based on the proxy properties that should be unique
    const key = `${proxy.accountId}-${proxy.proxiedAccountId}-${proxy.chainId}-${proxy.proxyType}-${proxy.delay}`;

    if (!proxyGroups.has(key)) {
      proxyGroups.set(key, []);
    }
    proxyGroups.get(key)!.push(proxy);
  }

  // Find duplicates and keep only the first occurrence (lowest ID)
  const toDelete: number[] = [];
  const toKeep: ProxyAccount[] = [];

  for (const [_, proxyGroup] of proxyGroups) {
    if (proxyGroup.length > 1) {
      // Sort by ID to ensure we keep the oldest entry (lowest ID)
      const sortedProxies = proxyGroup.sort((a, b) => a.id - b.id);
      toKeep.push(sortedProxies[0]);

      // Mark the rest for deletion
      for (let i = 1; i < sortedProxies.length; i++) {
        toDelete.push(sortedProxies[i].id);
      }
    } else {
      toKeep.push(proxyGroup[0]);
    }
  }

  // Delete duplicates
  if (toDelete.length > 0) {
    await t.table('proxies').bulkDelete(toDelete);
  }

  // Update the remaining entries to ensure they have the correct data
  if (toKeep.length > 0) {
    await t.table('proxies').bulkPut(toKeep);
  }
}
