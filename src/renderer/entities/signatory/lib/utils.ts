import keyBy from 'lodash/keyBy';

import { Account, AccountId, Wallet } from '@shared/core';
import { walletUtils } from '@entities/wallet';

export const singnatoryUtils = {
  getSignatoryWallet,
};

function getSignatoryWallet(wallets: Wallet[], accounts: Account[], accountId: AccountId): Wallet | undefined {
  const walletsMap = keyBy(wallets, 'id');

  const signatoryAccount = accounts.find((account) => {
    const accountIdMatch = accountId === account.accountId;
    const wallet = walletsMap[account.walletId];

    if (!accountIdMatch || !wallet) return;

    return (
      walletUtils.isValidSignatory(wallet) || walletUtils.isPolkadotVault(wallet) || walletUtils.isMultiShard(wallet)
    );
  });

  return signatoryAccount && walletsMap[signatoryAccount.walletId];
}
