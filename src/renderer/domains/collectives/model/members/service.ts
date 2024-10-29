import { type Chain, type Wallet } from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { accountUtils, walletUtils } from '@/entities/wallet';

import { type CoreMember, type Member } from './types';

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

const isCoreMember = (member: Member | CoreMember): member is CoreMember => {
  const hasActive = 'isActive' in member;
  const hasPromotion = 'lastPromotion' in member;
  const hasProof = 'lastProof' in member;

  return hasActive && hasPromotion && hasProof;
};

export const membersService = {
  findMachingMember,
  findMachingAccount,
  isCoreMember,
};
