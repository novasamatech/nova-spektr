import { nonNullable } from '@/shared/lib/utils';
import { memberService, salaryService } from '@/domains/collectives';
import { useFellowshipMember, useFellowshipMemberSalaryClaimStatus } from '@/aggregates/fellowship-member';
import { useCurrentSalaryPeriod } from '@/aggregates/fellowship-network';
import { RequestPayout } from '../components/tasks/RequestPayout';
import { RequestSalary } from '../components/tasks/RequestSalary';
import { RequestSalaryInduct } from '../components/tasks/RequestSalaryInduct';
import { type TaskDescription } from '../types';

import { useMemberBasketOperations } from './useMemberBasketOperations';

export const useMemberSalaryTasks = () => {
  const { data: operations, pending: pendingOperations } = useMemberBasketOperations();
  const { data: member, pending: pendingMember } = useFellowshipMember();
  const { data: claimStatus, pending: pendingClaimStatus } = useFellowshipMemberSalaryClaimStatus();
  const { data: period, pending: pendingPeriod } = useCurrentSalaryPeriod();

  const tasks: TaskDescription[] = [];

  if (nonNullable(member) && nonNullable(period) && nonNullable(claimStatus) && memberService.isCoreMember(member)) {
    if (salaryService.canRequestSalary(claimStatus, period)) {
      tasks.push({
        id: 'salary_request',
        weight: 0,
        group: 'personal',
        body: RequestSalary,
        meta: { transaction: operations['salary_request']?.coreTx ?? null, tags: [] },
      });
    }

    if (salaryService.canRequestSalaryPayout(claimStatus, period)) {
      tasks.push({
        id: 'salary_payout',
        weight: 0,
        group: 'personal',
        body: RequestPayout,
        meta: { transaction: operations['salary_payout']?.coreTx ?? null, tags: [] },
      });
    }

    if (!salaryService.isInducted(claimStatus)) {
      tasks.push({
        id: 'salary_induct',
        weight: 0,
        group: 'personal',
        body: RequestSalaryInduct,
        meta: { transaction: operations['salary_induct']?.coreTx ?? null, tags: [] },
      });
    }
  }

  return { data: tasks, pending: pendingOperations || pendingClaimStatus || pendingMember || pendingPeriod };
};
