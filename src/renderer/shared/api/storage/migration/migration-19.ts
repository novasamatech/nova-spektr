import { type Transaction } from 'dexie';

import { AccountNameType, AccountType } from '@/shared/core';

type RawAccount = { id: string; nameType?: AccountNameType; accountType?: AccountType; [key: string]: unknown };

/**
 * Multisig accounts created via account-sync received nameType: GENERATED
 * (wrong fallback in createWalletsFx), which allowed backend contacts to
 * override the wallet name. Backfill them to CUSTOM so wallet names take
 * priority over address-book contacts.
 */
export async function migrateMultisigAccountNameType(t: Transaction): Promise<void> {
  const allAccounts = await t.table<RawAccount>('accounts2').toArray();

  const toUpdate = allAccounts.filter(
    (account) =>
      account.nameType === AccountNameType.GENERATED &&
      (account.accountType === AccountType.MULTISIG || account.accountType === AccountType.FLEX_MULTISIG),
  );

  if (toUpdate.length === 0) return;

  const updated = toUpdate.map((account) => ({
    ...account,
    nameType: AccountNameType.CUSTOM,
  }));

  await t.table('accounts2').bulkPut(updated);
}
