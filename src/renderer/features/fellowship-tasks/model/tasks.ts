import { combine } from 'effector';

import { nonNullable, nullable, toAccountId, toKeysRecord } from '@/shared/lib/utils';
import {
  type OngoingReferendum,
  evidenceService,
  memberService,
  salaryService,
  trackService,
  votingService,
} from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { basketOperations } from '@/aggregates/basket-operations';
import { ReferendumVoting } from '../components/tasks/ReferendumVoting';
import { RequestPayout } from '../components/tasks/RequestPayout';
import { RequestSalary } from '../components/tasks/RequestSalary';
import { RequestSalaryInduct } from '../components/tasks/RequestSalaryInduct';
import { type OperationType, type TaskDescription } from '../types';

import { memberSalary } from './memberSalary';
import { profile } from './profile';
import { referendumList } from './referendums';

const $hasPermission = profile.$account.map(account => {
  return nonNullable(account) && accountService.hasPermissionToMakeActions(account);
});

const $hasAccount = profile.$account.map(nonNullable);

const $basketOperations = combine(basketOperations.$list, profile.$member, (operations, member) => {
  return operations.filter(
    operation =>
      nonNullable(member) &&
      toAccountId(operation.coreTx.address) === member.accountId &&
      (memberService.isSetActiveTransaction(operation.coreTx) ||
        salaryService.isSalaryInductTransaction(operation.coreTx) ||
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

      if (salaryService.isSalaryInductTransaction(operation.coreTx)) {
        return 'salary_induct';
      }

      if (salaryService.isSalaryRequestTransaction(operation.coreTx)) {
        return 'salary_request';
      }

      if (salaryService.isSalaryPayoutTransaction(operation.coreTx)) {
        return 'salary_payout';
      }

      if (evidenceService.isEvidenceTransaction(operation.coreTx)) {
        return `evidence`;
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

    if (salaryService.canInductSalary(claimStatus)) {
      return [
        {
          id: 'salary_induct',
          priority: 0,
          body: RequestSalaryInduct,
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
  {
    salaryTasks: $salaryTasks,
    referendumTasks: $referendumTasks,
    operations: $basketOperationsIds,
    hasPermission: $hasPermission,
  },
  ({ salaryTasks, referendumTasks, operations, hasPermission }) => {
    if (hasPermission) {
      const operationsMap = toKeysRecord(operations);
      return [...salaryTasks, ...referendumTasks]
        .filter(t => !(t.id in operationsMap))
        .sort((a, b) => a.priority - b.priority);
    }

    return [];
  },
);

const $showReadyToSignScreen = combine(
  $basketOperations,
  $list,
  (operations, list) => operations.length > 0 && list.length === 0,
);

export const tasks = {
  $showReadyToSignScreen,
  $hasPermission,
  $hasAccount,
  $basketOperations,
  $list,
};
