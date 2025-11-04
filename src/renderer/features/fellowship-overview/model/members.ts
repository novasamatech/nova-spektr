import { combine, sample } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { memberService, salary as salaryModel, salaryService } from '@/domains/collectives';
import { identityService } from '@/domains/network';
import { fellowshipMember } from '@/aggregates/fellowship-member';

import { fellowshipOverviewFeature } from './feature';
import { fellowship } from './fellowship';
import { identityModel } from './identity';

const $salaries = salaryModel.$salaries.map(s => s['fellowship'] ?? {});

const $membersWithSalary = combine(
  combine(fellowship.$store, identityModel.$identity),
  combine(fellowshipMember.$currentMember, fellowshipOverviewFeature.input),
  $salaries,
).map(([[fellowshipStore, identities], [currentMember, input], salaries]) => {
  if (nullable(fellowshipStore) || nullable(input)) {
    return [];
  }

  const members = fellowshipStore.members?.filter(memberService.isCoreMember) ?? [];

  return members
    .map(member => {
      let salaryText = '-';
      let salaryAmount = 0;

      if (salaries[input.chainId]) {
        const memberSalary = salaryService.getMemberSalary(member, salaries[input.chainId]);
        const rawSalary = member.isActive ? memberSalary.active : memberSalary.passive;
        salaryText = salaryService.formatSalaryAmount(rawSalary);
        salaryAmount = rawSalary.toNumber();
      }

      return {
        ...member,
        name: identities[member.accountId] ? identityService.getFullName(identities[member.accountId]) : undefined,
        salary: salaryText,
        salaryAmount,
      };
    })
    .sort((a, b) => {
      // Sort to put current user at the top
      const aIsCurrentUser = currentMember?.accountId === a.accountId;
      const bIsCurrentUser = currentMember?.accountId === b.accountId;

      if (aIsCurrentUser && !bIsCurrentUser) return -1;
      if (!aIsCurrentUser && bIsCurrentUser) return 1;
      return 0;
    });
});

sample({
  clock: fellowshipOverviewFeature.running,
  target: [salaryModel.requestStatus, salaryModel.requestSalaries],
});

export const membersModel = {
  $membersWithSalary,
};
