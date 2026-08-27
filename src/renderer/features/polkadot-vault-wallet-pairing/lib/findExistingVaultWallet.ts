import { type Wallet, WalletType } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

const VAULT_WALLET_TYPES = new Set<WalletType>([WalletType.POLKADOT_VAULT, WalletType.SINGLE_PARITY_SIGNER]);

/**
 * Finds a Polkadot Vault / Parity Signer wallet that was already paired from
 * the same device key. Identity is the scanned public key: a vault wallet's
 * `rootAccountId`, or — for legacy rows / singleshard — the account id itself.
 *
 * Other wallet types (e.g. a watch-only wallet tracking the same address) are
 * deliberately ignored: they are a different kind of wallet, and adding the
 * signing one on top is a legitimate upgrade, not a duplicate.
 */
export const findExistingVaultWallet = (wallets: Wallet[], rootAccountId: AccountId | null): Wallet | null => {
  if (nullable(rootAccountId)) return null;

  const match = wallets.find(wallet => {
    if (!VAULT_WALLET_TYPES.has(wallet.type)) return false;
    if ('rootAccountId' in wallet && wallet.rootAccountId === rootAccountId) return true;

    return wallet.accounts.some(account => account.accountId === rootAccountId);
  });

  return match ?? null;
};
