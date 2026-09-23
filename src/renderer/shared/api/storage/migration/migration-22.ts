import { type Transaction } from 'dexie';

import { AccountNameType } from '@/shared/core';
import { isGeneratedAccountName } from '@/shared/lib/utils';

/**
 * Migration-14 stamped nameType: CUSTOM onto every pre-existing account.
 * Migration-21 repaired Polkadot Vault derived keys, but multisig, proxied and
 * flexible-multisig accounts were left behind: their stored name is the
 * shortened address the app generated at sync time, and a CUSTOM stamp makes
 * name resolution return that address instead of the address-book contact.
 *
 * Reset to GENERATED every CUSTOM account whose name is a shortening of its own
 * account id — as an ss58 address under the app default or generic prefix, or
 * as the raw hex id, optionally wrapped in a proxy's "<Type> for [pure] …".
 * Chain configs are fetched at runtime, so a proxied account named with a
 * chain-specific prefix cannot be regenerated here; name resolution applies the
 * same check with the real prefix for those. Idempotent.
 */
export async function resetGeneratedAccountNameType(t: Transaction): Promise<void> {
  await t
    .table('accounts2')
    .toCollection()
    .modify((account) => {
      if (account.nameType !== AccountNameType.CUSTOM) return false;
      if (typeof account.name !== 'string' || typeof account.accountId !== 'string') return false;
      if (!isGeneratedAccountName(account.name, account.accountId, undefined)) return false;

      account.nameType = AccountNameType.GENERATED;
    });
}
