import { dictionary } from '@/shared/lib/utils';
import { type AnyAccount, accountsService } from '@/domains/network';

import { type CoreMember, type Member } from './types';

const findMatchingMember = (accounts: AnyAccount[], members: Member[]) => {
  const accountsDictionary = dictionary(accounts, 'accountId');

  return members.find(member => member.accountId in accountsDictionary) ?? null;
};

const findMatchingAccount = (accounts: AnyAccount[], member: Member) => {
  const found = accounts.filter(a => a.accountId === member.accountId);

  if (found.length > 1) {
    const accountWithWritePermission = found.find(accountsService.hasPermissionToMakeActions);
    if (accountWithWritePermission) {
      return accountWithWritePermission;
    }
  }

  return found.at(0) ?? null;
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
