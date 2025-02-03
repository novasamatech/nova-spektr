import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { salaryService } from '@/domains/collectives';
import { RequestPayout } from '../components/tasks/RequestPayout';
import { RequestSalary } from '../components/tasks/RequestSalary';
import { type TaskDescription } from '../types';

import { memberSalary } from './memberSalary';

const $salaryTasks = combine(
  memberSalary.$currentPeriod,
  memberSalary.$memberClaimStatus,
  (period, claimStatus): TaskDescription[] => {
    if (nullable(period) || nullable(claimStatus)) return [];

    if (salaryService.canRequestSalary(claimStatus, period)) {
      return [
        {
          id: 'requestSalary',
          priority: 0,
          body: RequestSalary,
        },
      ];
    }

    if (salaryService.canRequestSalaryPayout(claimStatus, period)) {
      return [
        {
          id: 'requestPayout',
          priority: 0,
          body: RequestPayout,
        },
      ];
    }

    return [];
  },
);

const $evidenceTasks = combine(
  memberSalary.$currentPeriod,
  memberSalary.$memberClaimStatus,
  (period, claimStatus): TaskDescription[] => {
    if (nullable(period) || nullable(claimStatus)) return [];

    return [];
  },
);

const $referendumTasks = combine(
  memberSalary.$currentPeriod,
  memberSalary.$memberClaimStatus,
  (period, claimStatus): TaskDescription[] => {
    if (nullable(period) || nullable(claimStatus)) return [];

    return [];
  },
);

const $list = combine($salaryTasks, $evidenceTasks, (salary, evidence) => {
  return [...salary, ...evidence].sort((a, b) => a.priority - b.priority);
});

export const tasks = {
  $list,
};
