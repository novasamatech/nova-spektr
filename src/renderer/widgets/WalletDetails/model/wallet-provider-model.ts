import { combine } from 'effector';

import { accountUtils, walletModel } from '@renderer/entities/wallet';
import { walletSelectModel } from '@renderer/features/wallets';
import { Account } from '@renderer/shared/core';
import { walletConnectModel } from '@renderer/entities/walletConnect';

const $accounts = combine(
  {
    details: walletSelectModel.$walletForDetails,
    accounts: walletModel.$accounts,
  },
  ({ details, accounts }): Account[] => {
    if (!details) return [];

    return accounts.filter((account) => account.walletId === details.id);
  },
);

const $connected = combine($accounts, walletConnectModel.$client, (accounts, client): boolean => {
  const account = accounts[0];
  if (!client || !account || !accountUtils.isWalletConnectAccount(account)) return false;

  const sessions = client?.session.getAll() || [];

  const storedSession = sessions.find((s) => s.topic === accounts[0].signingExtras?.sessionTopic);

  return Boolean(storedSession);
});

export const walletProviderModel = {
  $accounts,
  $connected,
};
