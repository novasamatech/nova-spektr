import keyBy from 'lodash/keyBy';

import { Account, AccountId, Wallet } from '@renderer/shared/core';
import { walletUtils } from '@renderer/entities/wallet';

export const singnatoryUtils = {
  getSignatoryWallet,
};

function getSignatoryWallet(wallets: Wallet[], accounts: Account[], accoutId: AccountId): Wallet | undefined {
  const walletsMap = keyBy(wallets, 'id');

  const signatoryAccount = accounts.find((account) => {
    const accountIdMatch = accoutId === account.accountId;
    const wallet = walletsMap[account.walletId];

    if (!accountIdMatch || !wallet) return;

    return walletUtils.isValidSignatory(wallet) || walletUtils.isMultiShard(wallet);
  });

  return signatoryAccount && walletsMap[signatoryAccount.walletId];
}
