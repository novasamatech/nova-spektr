import { type Transaction } from 'dexie';

import { AccountNameType, AccountType, SigningType } from '@/shared/core';

/**
 * Migration-14 stamped nameType: CUSTOM onto every pre-existing account,
 * including Polkadot Vault derived keys (CHAIN/SHARD accounts) whose name was
 * never actually chosen by the user (Vault has no per-account rename UI for
 * these — they're auto-labeled "Main" or a raw derivation path). Reset those
 * back to GENERATED so address-book resolution applies to them.
 *
 * Deliberately excludes the BASE/universal Vault account created when a pairing
 * produces zero derived keys (`ManageVault.tsx`'s fallback) — its name is the
 * wallet name the user actually typed, so CUSTOM is correct there. Idempotent.
 */
export async function resetVaultAccountNameType(t: Transaction): Promise<void> {
  await t
    .table('accounts2')
    .toCollection()
    .modify((account) => {
      if (account.signingType !== SigningType.POLKADOT_VAULT) return;
      if (account.accountType !== AccountType.CHAIN && account.accountType !== AccountType.SHARD) return;
      if (account.nameType !== AccountNameType.CUSTOM) return;

      account.nameType = AccountNameType.GENERATED;
    });
}
