import { type Wallet } from '@/shared/core';
import { walletUtils } from '@/entities/wallet';

import { type WalletTypeBucket } from './types';

/**
 * Collapses the wallet type zoo into the handful of buckets the table filters
 * on. `null` wallet means the row's accountId has no local account behind it —
 * an address-book contact.
 */
export const getWalletTypeBucket = (wallet: Wallet | null): WalletTypeBucket => {
  if (wallet === null) return 'contact';
  if (walletUtils.isPolkadotVaultGroup(wallet)) return 'vault';
  if (walletUtils.isAnyMultisig(wallet)) return 'multisig';
  if (walletUtils.isWatchOnly(wallet)) return 'watchOnly';
  if (walletUtils.isWalletConnectGroup(wallet)) return 'walletConnect';

  return 'other';
};
