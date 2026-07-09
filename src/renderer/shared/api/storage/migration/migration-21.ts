import { type Transaction } from 'dexie';

import { type Wallet, AccountNameType, AccountType, WalletType } from '@/shared/core';

/**
 * Migration-14 stamped nameType: CUSTOM onto every pre-existing account,
 * including Polkadot Vault derived keys (CHAIN/SHARD accounts) whose name was
 * never actually chosen by the user (Vault has no per-account rename UI for
 * these — they're auto-labeled "Main" or a raw derivation path). Reset those
 * back to GENERATED so address-book resolution applies to them.
 *
 * Vault membership is checked via the owning wallet's type rather than the
 * account's own signingType: accounts that migrated from a pre-accounts2
 * Multishard wallet (migration-2 -> migration-3 -> migration-6) kept their
 * original signingType (PARITY_SIGNER, i.e. 'signing_ps') on every regrouped
 * chain/shard account — only the synthesized BASE account was stamped
 * POLKADOT_VAULT. Keying off wallet.type catches those legacy accounts too.
 *
 * Deliberately excludes the BASE/universal Vault account created when a pairing
 * produces zero derived keys (`ManageVault.tsx`'s fallback) — its name is the
 * wallet name the user actually typed, so CUSTOM is correct there. Idempotent.
 */
export async function resetVaultAccountNameType(t: Transaction): Promise<void> {
  const wallets = await t.table<Wallet>('wallets').toArray();
  const vaultWalletIds = new Set(
    wallets
      .filter((wallet) => wallet.type === WalletType.POLKADOT_VAULT || wallet.type === WalletType.SINGLE_PARITY_SIGNER)
      .map((wallet) => wallet.id),
  );

  await t
    .table('accounts2')
    .toCollection()
    .modify((account) => {
      if (!vaultWalletIds.has(account.walletId)) return false;
      if (account.accountType !== AccountType.CHAIN && account.accountType !== AccountType.SHARD) return false;
      if (account.nameType !== AccountNameType.CUSTOM) return false;

      account.nameType = AccountNameType.GENERATED;
    });
}
