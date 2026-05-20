import { type Transaction } from 'dexie';

/**
 * Replaces the boolean wallet `isHidden` flag with a `hiddenReason`
 * discriminator. Pre-existing hidden wallets were all hidden by the user, so
 * they become `'manual'`. Idempotent.
 */
export async function migrateWalletsHiddenReason(t: Transaction): Promise<void> {
  await t
    .table('wallets')
    .toCollection()
    .modify((wallet) => {
      if (!('isHidden' in wallet)) return;

      if (wallet.isHidden) {
        wallet.hiddenReason = 'manual';
      }

      delete wallet.isHidden;
    });
}
