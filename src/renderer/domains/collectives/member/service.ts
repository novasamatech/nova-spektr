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

function canPromote(member: Member) {
  return member.rank < 7;
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

export const memberService = {
  findMatchingMember,
  findMatchingAccount,
  isCoreMember,
  canChangeActiveState,
  canPromote,

  createSetActiveTransaction,
  isSetActiveTransaction,
};
