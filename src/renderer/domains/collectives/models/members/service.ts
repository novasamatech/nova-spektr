import { type Chain, type Wallet } from '@/shared/core';
import { accountUtils } from '@/entities/wallet';

import { type Member } from './types';

const findMachingAccount = (wallet: Wallet, members: Member[], chain: Chain) => {
  const walletAccounts = wallet.accounts.filter(account => {
    if (!accountUtils.isNonBaseVaultAccount(account, wallet)) return false;

    return accountUtils.isChainAndCryptoMatch(account, chain);
  });

  return members.find(member => walletAccounts.some(account => account.accountId === member.accountId)) ?? null;
};

export const membersService = {
  findMachingAccount,
};
