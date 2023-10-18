import { combine } from 'effector';

import { walletModel } from '@renderer/entities/wallet';
import { walletSelectModel } from '@renderer/features/wallets';
import { Account } from '@renderer/shared/core';

const $accounts = combine(walletSelectModel.$walletForDetails, walletModel.$accounts, (...args): Account[] => {
  const [walletForDetails, accounts] = args;

  if (!walletForDetails) return [];

  return accounts.filter((account) => account.walletId === walletForDetails.id);
});

export const walletProviderModel = {
  $accounts,
};
