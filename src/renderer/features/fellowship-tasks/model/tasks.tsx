import { combine } from 'effector';

import { nonNullable, nullable, toAccountId, toKeysRecord } from '@/shared/lib/utils';
import {
  type OngoingReferendum,
  memberService,
  salaryService,
  trackService,
  votingService,
} from '@/domains/collectives';
import { basketOperations } from '@/aggregates/basket-operations';
import { ReferendumVoting } from '../components/tasks/ReferendumVoting';
import { RequestPayout } from '../components/tasks/RequestPayout';
import { RequestSalary } from '../components/tasks/RequestSalary';
import { type OperationType, type TaskDescription } from '../types';

import { memberSalary } from './memberSalary';
import { profile } from './profile';
import { referendumList } from './referendums';

const $basketOperations = combine(basketOperations.$list, profile.$member, (operations, member) => {
  return operations.filter(
    operation =>
      nonNullable(member) &&
      toAccountId(operation.coreTx.address) === member.accountId &&
      (memberService.isSetActiveTransaction(operation.coreTx) ||
        salaryService.isSalaryRequestTransaction(operation.coreTx) ||
        salaryService.isSalaryPayoutTransaction(operation.coreTx) ||
        votingService.isVotingTransaction(operation.coreTx)),
  );
});

const $basketOperationsIds = $basketOperations.map(operations => {
  return operations
    .map<OperationType | null>(operation => {
      // TODO support other types
      if (memberService.isSetActiveTransaction(operation.coreTx)) {
        return 'set_active';
      }

      // TODO support other types
      if (salaryService.isSalaryRequestTransaction(operation.coreTx)) {
        return 'salary_request';
      }

      if (salaryService.isSalaryPayoutTransaction(operation.coreTx)) {
        return 'salary_payout';
      }

      if (votingService.isVotingTransaction(operation.coreTx)) {
        return `referendum_${operation.coreTx.args.poll}`;
      }

      return null;
    })
    .filter(nonNullable);
});

const $salaryTasks = combine(
  memberSalary.$currentPeriod,
  memberSalary.$memberClaimStatus,
  (period, claimStatus): TaskDescription[] => {
    if (nullable(period) || nullable(claimStatus)) return [];

    if (salaryService.canRequestSalary(claimStatus, period)) {
      return [
        {
          id: 'salary_request',
          priority: 0,
          body: RequestSalary,
          meta: {},
        },
      ];
    }

    if (salaryService.canRequestSalaryPayout(claimStatus, period)) {
      return [
        {
          id: 'salary_payout',
          priority: 0,
          body: RequestPayout,
          meta: {},
        },
      ];
    }

    return [];
  },
);

const $referendumTasks = combine(referendumList.$notVotedReferendumns, referendums => {
  return referendums
    .filter(referendum => {
      return trackService.isRetentionTrack(referendum.track) || trackService.isPromotionTrack(referendum.track);
    })
    .map<TaskDescription<{ referendum: OngoingReferendum }>>(referendum => {
      return {
        id: `referendum_${referendum.id}`,
        priority: 1,
        body: ReferendumVoting,
        meta: { referendum },
      };
    });
});

const $list = combine(
  { salaryTasks: $salaryTasks, referendumTasks: $referendumTasks, operations: $basketOperationsIds },
  ({ salaryTasks, referendumTasks, operations }) => {
    const operationsMap = toKeysRecord(operations);
    return [...salaryTasks, ...referendumTasks]
      .filter(t => !(t.id in operationsMap))
      .sort((a, b) => a.priority - b.priority);
  },
);

export const tasks = {
  $basketOperations,
  $list,
};
