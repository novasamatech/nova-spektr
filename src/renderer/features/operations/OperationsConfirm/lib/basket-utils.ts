import { Wallet } from '@shared/core';
import { walletUtils } from '@entities/wallet';

export const basketUtils = {
  isBasketAvailable,
};

function isBasketAvailable(wallet: Wallet): boolean {
  return walletUtils.isPolkadotVault(wallet) || walletUtils.isMultiShard(wallet);
}
