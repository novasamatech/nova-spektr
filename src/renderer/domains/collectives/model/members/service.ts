import { type Account, type Chain, type Wallet } from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { accountUtils } from '@/entities/wallet';

import { type CoreMember, type Member } from './types';

const findMatchingMember = (wallet: Wallet, accounts: Account[], chain: Chain, members: Member[]) => {
  const walletAccounts = accounts.filter(account => {
    return accountUtils.isNonBaseVaultAccount(account, wallet) && accountUtils.isChainAndCryptoMatch(account, chain);
  });
  const accountsDictionary = dictionary(walletAccounts, 'accountId');

  return members.find(member => member.accountId in accountsDictionary) ?? null;
};

const findMatchingAccount = (accounts: Account[], member: Member) => {
  return accounts.find(a => a.accountId === member.accountId) ?? null;
};

const isCoreMember = (member: Member | CoreMember): member is CoreMember => {
  const hasActive = 'isActive' in member;
  const hasPromotion = 'lastPromotion' in member;
  const hasProof = 'lastProof' in member;

  return hasActive && hasPromotion && hasProof;
};

export const membersService = {
  findMatchingMember,
  findMatchingAccount,
  isCoreMember,
};
