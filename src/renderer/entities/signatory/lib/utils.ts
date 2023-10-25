import keyBy from 'lodash/keyBy';

import { Account, AccountId, Wallet } from '@renderer/shared/core';
import { walletUtils } from '@renderer/entities/wallet';

export const singnatoryUtils = {
  getSignatoryWallet,
};

function getSignatoryWallet(accoutId: AccountId, accounts: Account[], wallets: Wallet[]): Wallet | undefined {
  const walletsMap = keyBy(wallets, 'id');

  const signatoryAccount = accounts.find((a) => {
    const wallet = walletsMap[a.walletId];

    return (
      accoutId === a.accountId && wallet && (walletUtils.isValidSignatory(wallet) || walletUtils.isMultiShard(wallet))
    );
  });

  return signatoryAccount && walletsMap[signatoryAccount?.walletId];
}
