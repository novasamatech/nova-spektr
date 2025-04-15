import { type Wallet } from '@/shared/core';
import { type AnyAccount, accountService } from '@/domains/network';
import { walletUtils } from '@/entities/wallet';

function isBasketAvailable(wallet: Wallet): boolean {
  return walletUtils.isPolkadotVault(wallet) || walletUtils.isSingleShard(wallet);
}

function isBasketAvailableForAccount(account: AnyAccount): boolean {
  return accountService.canSignMultipleTransactions(account);
}

export const basketUtils = {
  isBasketAvailable,
  isBasketAvailableForAccount,
};
