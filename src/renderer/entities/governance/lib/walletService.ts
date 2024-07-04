import { Chain, Wallet } from '@shared/core';
import { accountUtils, walletUtils } from '@entities/wallet';
import { toAddress } from '@shared/lib/utils';

const getAddressesForWallet = (wallet: Wallet, chain: Chain) => {
  const matchedAccounts = walletUtils.getAccountsBy([wallet], (account) => {
    return accountUtils.isChainIdMatch(account, chain!.chainId);
  });

  return matchedAccounts.map((a) => toAddress(a.accountId, { prefix: chain!.addressPrefix }));
};

export const walletService = {
  getAddressesForWallet,
};
