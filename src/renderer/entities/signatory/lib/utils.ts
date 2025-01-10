import { type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { walletUtils } from '@/entities/wallet';

export const signatoryUtils = {
  getSignatoryWallet,
};

function getSignatoryWallet(wallets: Wallet[], accountId: AccountId): Wallet | undefined {
  return wallets.find((wallet) => {
    const hasMatch = wallet.accounts?.some((account) => account.accountId === accountId);

    return hasMatch && walletUtils.isValidSignatory(wallet);
  });
}
