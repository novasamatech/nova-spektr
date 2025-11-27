import { type Chain, type Transaction, TransactionType } from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';

import { type CoreMember, type Member, type SetActiveTransaction } from './types';

function findMatchingMember(accounts: AnyAccount[], members: Member[], walletId: number | null) {
  const accountsDictionary = dictionary(accounts, 'accountId');
  const m = members.filter(member => member.accountId in accountsDictionary);

  if (m.length > 1 && walletId) {
    m.sort(a => {
      const acc = accountsDictionary[a.accountId];
      return acc?.walletId === walletId ? -1 : 1;
    });
  }

  return m.at(0) ?? null;
}

function findMatchingAccount(accounts: AnyAccount[], member: Member, selectedWallet: number | null) {
  const found = accounts.filter(a => a.accountId === member.accountId);

  if (found.length > 1) {
    const currentWalletAccounts = found.filter(a => a.walletId === selectedWallet);
    const accountWithWritePermission = currentWalletAccounts.find(accountService.hasPermissionToMakeActions);
    if (accountWithWritePermission) {
      return accountWithWritePermission;
    }
  }

  return found.at(0) ?? null;
}

function isCoreMember(member: Member | CoreMember): member is CoreMember {
  const hasActive = 'isActive' in member;
  const hasPromotion = 'lastPromotion' in member;
  const hasProof = 'lastProof' in member;

  return hasActive && hasPromotion && hasProof;
}

function canChangeActiveState(member: Member | CoreMember) {
  return isCoreMember(member) && member.rank > 0;
}

/**
 * Despite the fact that technically the maximum rank is 9, in real world no one
 * can achieve it (Gavin's rank is 7).
 */
function canPromote(member: Member) {
  return member.rank < 7;
}

/**
 * Gavin does not need to prove himself.
 */
function shouldProve(member: Member) {
  return member.rank < 7 && member.rank !== 0;
}

function isRetentionRestricted(member: Member) {
  return member.rank === 0;
}

/**
 * Case when evidence is posted but the referendum has not been created yet.
 * This check validates the user's ability to vote in this potential
 * referendum.
 */
function canVoteForProposal(member: Member, rank: number) {
  return member.rank > rank + 2;
}

type SetActiveTransactionParams = {
  pallet: CollectivePalletsType;
  account: AnyAccount;
  chain: Chain;
  isActive: boolean;
};

function createSetActiveTransaction({
  pallet,
  account,
  chain,
  isActive,
}: SetActiveTransactionParams): SetActiveTransaction {
  return {
    accountId: account.accountId,
    chainId: chain.chainId,
    type: TransactionType.COLLECTIVE_SET_ACTIVE,
    args: { pallet, isActive },
  };
}

function isSetActiveTransaction(transaction: Transaction): transaction is SetActiveTransaction {
  return transaction.type === TransactionType.COLLECTIVE_SET_ACTIVE;
}

type RankActivityThreshold = {
  activity: number | null;
  agreement: number | null;
};

const rankThresholds: Record<number, RankActivityThreshold> = {
  0: { activity: null, agreement: null },
  1: { activity: 90, agreement: null },
  2: { activity: 80, agreement: null },
  3: { activity: 70, agreement: 100 },
  4: { activity: 60, agreement: 90 },
  5: { activity: 50, agreement: 80 },
  6: { activity: 40, agreement: 70 },
  7: { activity: null, agreement: null },
  8: { activity: null, agreement: null },
  9: { activity: null, agreement: null },
};

function getActivityAndAgreementThresholds(rank: number) {
  return rankThresholds[rank] ?? { activity: null, agreement: null };
}

export const memberService = {
  findMatchingMember,
  findMatchingAccount,
  isCoreMember,
  canChangeActiveState,
  canPromote,
  canVoteForProposal,
  getActivityAndAgreementThresholds,
  shouldProve,
  isRetentionRestricted,

  createSetActiveTransaction,
  isSetActiveTransaction,
};
