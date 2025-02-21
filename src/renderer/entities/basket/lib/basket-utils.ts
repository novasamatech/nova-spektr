import { type Wallet } from '@/shared/core';
import { type AnyAccount, accountsService } from '@/domains/network';
import { walletUtils } from '@/entities/wallet';

function isBasketAvailable(wallet: Wallet): boolean {
  return walletUtils.isPolkadotVault(wallet) || walletUtils.isMultiShard(wallet);
}

function isBasketAvailableForAccount(account: AnyAccount): boolean {
  return accountsService.canSignMultipleTransactions(account);
}

export const basketUtils = {
  isBasketAvailable,
  isBasketAvailableForAccount,
};
