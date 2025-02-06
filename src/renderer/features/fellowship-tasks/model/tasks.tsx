import { combine } from 'effector';

import { nullable } from '@/shared/lib/utils';
import { type OngoingReferendum, salaryService } from '@/domains/collectives';
import { ReferendumVoting } from '../components/tasks/ReferendumVoting';
import { RequestPayout } from '../components/tasks/RequestPayout';
import { RequestSalary } from '../components/tasks/RequestSalary';
import { type TaskDescription } from '../types';

import { memberSalary } from './memberSalary';
import { referendumList } from './referendums';

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
          meta: {},
        },
      ];
    }

    if (salaryService.canRequestSalaryPayout(claimStatus, period)) {
      return [
        {
          id: 'requestPayout',
          priority: 0,
          body: RequestPayout,
          meta: {},
        },
      ];
    }

    return [];
  },
);

const $referendumTasks = combine(
  referendumList.$notVotedReferendumns,
  (referendums): TaskDescription<{ referendum: OngoingReferendum }>[] => {
    return referendums.map(referendum => {
      return {
        id: `referendum - ${referendum.id}`,
        priority: 1,
        body: ReferendumVoting,
        meta: { referendum },
      };
    });
  },
);

const $list = combine($salaryTasks, $referendumTasks, (salary, evidence): TaskDescription[] => {
  return [...salary, ...evidence].sort((a, b) => a.priority - b.priority);
});

export const tasks = {
  $list,
};
