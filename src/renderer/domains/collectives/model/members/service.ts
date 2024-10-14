import { type Chain, type Wallet } from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { accountUtils, walletUtils } from '@/entities/wallet';

import { type Member } from './types';

const findMachingMember = (wallet: Wallet, members: Member[], chain: Chain) => {
  const walletAccounts = wallet.accounts.filter(account => {
    return accountUtils.isNonBaseVaultAccount(account, wallet) && accountUtils.isChainAndCryptoMatch(account, chain);
  });
  const accountsDictionary = dictionary(walletAccounts, 'accountId');

  return members.find(member => member.accountId in accountsDictionary) ?? null;
};

const findMachingAccount = (wallet: Wallet, member: Member) => {
  return walletUtils.getAccountBy([wallet], a => {
    return a.accountId === member.accountId;
  });
};

export const membersService = {
  findMachingMember,
  findMachingAccount,
};
