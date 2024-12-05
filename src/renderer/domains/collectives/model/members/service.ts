import { type Account, type Chain } from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { accountUtils } from '@/entities/wallet';

import { type CoreMember, type Member } from './types';

const findMachingMember = (accounts: Account[], members: Member[], chain: Chain) => {
  const walletAccounts = accounts.filter(account => {
    return !accountUtils.isBaseAccount(account) && accountUtils.isChainAndCryptoMatch(account, chain);
  });
  const accountsDictionary = dictionary(walletAccounts, 'accountId');

  return members.find(member => member.accountId in accountsDictionary) ?? null;
};

const findMachingAccount = (accounts: Account[], member: Member) => {
  return accounts.find(a => a.accountId === member.accountId) ?? null;
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
