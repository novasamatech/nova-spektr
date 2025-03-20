import { combine } from 'effector';
import { or } from 'patronum';

import { nonNullable, nullable, toKeysRecord } from '@/shared/lib/utils';
import {
  type CompletedReferendum,
  type OngoingReferendum,
  evidenceService,
  memberService,
  salaryService,
  trackService,
  votingService,
} from '@/domains/collectives';
import { basketOperations } from '@/aggregates/basket-operations';
import { CompletedReferendumVoting } from '../components/tasks/CompletedReferendumVoting';
import { PromotionRetentionVoting } from '../components/tasks/PromotionRetentionVoting';
import { RequestPayout } from '../components/tasks/RequestPayout';
import { RequestPromotion } from '../components/tasks/RequestPromotion';
import { RequestRetention } from '../components/tasks/RequestRetention';
import { RequestSalary } from '../components/tasks/RequestSalary';
import { RequestSalaryInduct } from '../components/tasks/RequestSalaryInduct';
import { type OperationType, type TaskDescription } from '../types';

import { evidenceInfo } from './evidence';
import { fellowshipTasksFeature } from './feature';
import { memberProfile } from './memberProfile';
import { memberSalary } from './memberSalary';
import { periods } from './periods';
import { referendums } from './referendums';

const $chain = fellowshipTasksFeature.input.map(input => input?.chain ?? null);
const $chainName = $chain.map(chain => chain?.name ?? 'Unknown');

const $basketOperations = combine(basketOperations.$list, memberProfile.$member, (operations, member) => {
  return operations.filter(
    operation =>
      nonNullable(member) &&
      operation.coreTx.accountId === member.accountId &&
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
  {
    member: memberProfile.$member,
    period: memberSalary.$currentPeriod,
    claimStatus: memberSalary.$memberClaimStatus,
  },
  ({ member, period, claimStatus }): TaskDescription[] => {
    if (nullable(member) || !memberService.isCoreMember(member)) return [];
    if (nullable(period) || nullable(claimStatus)) return [];

    if (salaryService.canRequestSalary(claimStatus, period)) {
      return [
        {
          id: 'salary_request',
          priority: 0,
          group: 'personal',
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
          group: 'personal',
          body: RequestPayout,
          meta: {},
        },
      ];
    }

    if (!salaryService.isInducted(claimStatus)) {
      return [
        {
          id: 'salary_induct',
          priority: 0,
          group: 'personal',
          body: RequestSalaryInduct,
          meta: {},
        },
      ];
    }

    return [];
  },
);

const $evidenceTasks = combine(
  {
    member: memberProfile.$member,
    evidencePopulated: evidenceInfo.$evidencePopulated,
    leftToPromotion: periods.$leftToPromotion,
    leftToDemotion: periods.$leftToDemotion,
    hasPromotionEvidence: evidenceInfo.$hasPromotionEvidence,
    hasRetentionEvidence: evidenceInfo.$hasRetentionEvidence,
  },
  ({
    member,
    evidencePopulated,
    leftToPromotion,
    hasPromotionEvidence,
    leftToDemotion,
    hasRetentionEvidence,
  }): TaskDescription[] => {
    if (!evidencePopulated || nullable(member) || !memberService.isCoreMember(member)) return [];

    if (nonNullable(leftToDemotion) && leftToDemotion > 0 && hasRetentionEvidence === false) {
      return [
        {
          id: 'evidence',
          priority: 0,
          group: 'personal',
          body: RequestRetention,
          meta: {},
        },
      ];
    }

    if (nonNullable(leftToPromotion) && leftToPromotion === 0 && hasPromotionEvidence === false) {
      return [
        {
          id: 'evidence',
          priority: 2,
          group: 'personal',
          body: RequestPromotion,
          meta: {},
        },
      ];
    }

    return [];
  },
);

const $promotionRetentionTasks = combine(referendums.$notVotedReferendumns, referendums => {
  return referendums
    .filter(referendum => {
      return trackService.isRetentionTrack(referendum.track) || trackService.isPromotionTrack(referendum.track);
    })
    .map<TaskDescription<{ referendum: OngoingReferendum }>>(referendum => {
      return {
        id: `referendum_${referendum.id}`,
        priority: 1,
        group: 'general',
        body: PromotionRetentionVoting,
        meta: { referendum },
      };
    });
});

const $completedReferendumsTasks = combine(referendums.$completed, referendums => {
  return referendums.map<TaskDescription<{ referendum: CompletedReferendum }>>(referendum => {
    return {
      id: `referendum_completed_${referendum.id}`,
      priority: 1,
      group: 'completed',
      body: CompletedReferendumVoting,
      meta: { referendum },
    };
  });
});

const $list = combine(
  {
    salaryTasks: $salaryTasks,
    referendumTasks: $promotionRetentionTasks,
    completedReferendumsTasks: $completedReferendumsTasks,
    evidenceTasks: $evidenceTasks,
    operations: $basketOperationsIds,
    hasPermission: memberProfile.$hasPermission,
  },
  ({ salaryTasks, referendumTasks, completedReferendumsTasks, evidenceTasks, operations, hasPermission }) => {
    if (hasPermission) {
      const operationsMap = toKeysRecord(operations);
      return [...salaryTasks, ...referendumTasks, ...evidenceTasks, ...completedReferendumsTasks]
        .filter(t => !(t.id in operationsMap))
        .sort((a, b) => a.priority - b.priority);
    }

    return [];
  },
);

export const tasks = {
  $chainName,
  $basketOperations,
  $list,
  pending: or(basketOperations.pending, memberProfile.$pending, evidenceInfo.pending),
};
