import { combine } from 'effector';
import { or } from 'patronum';

import { type Transaction } from '@/shared/core';
import { groupBy, nonNullable, nullable } from '@/shared/lib/utils';
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
import { OngoingReferendumVoting } from '../components/tasks/OngoingReferendumVoting';
import { PromotionRetentionVoting } from '../components/tasks/PromotionRetentionVoting';
import { RequestPayout } from '../components/tasks/RequestPayout';
import { RequestPromotion } from '../components/tasks/RequestPromotion';
import { RequestRetention } from '../components/tasks/RequestRetention';
import { RequestSalary } from '../components/tasks/RequestSalary';
import { RequestSalaryInduct } from '../components/tasks/RequestSalaryInduct';
import { tasksService } from '../service';
import { type OperationType, type TaskDescription } from '../types';

import { block } from './block';
import { evidenceInfo } from './evidence';
import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { memberProfile } from './memberProfile';
import { memberSalary } from './memberSalary';
import { periods } from './periods';
import { referendums } from './referendums';

const $chain = fellowshipTasksFeature.input.map(input => input?.chain ?? null);
const $member = fellowshipTasksFeature.input.map(input => input?.member ?? null);
const $maxRank = fellowship.$store.map(input => input?.maxRank ?? 0);
const $members = fellowship.$store.map(input => input?.members ?? []);
const $chainName = $chain.map(chain => chain?.name ?? 'Unknown');

const $memberBasketOperations = combine(basketOperations.$list, memberProfile.$member, (operations, member) => {
  if (nullable(member)) return [];
  return operations.filter(operation => operation.coreTx.accountId === member.accountId);
});

const $basketOperationsMap = $memberBasketOperations.map(operations => {
  const map: Partial<Record<OperationType, Transaction>> = {};

  for (const operation of operations) {
    const transaction = operation.coreTx;
    if (memberService.isSetActiveTransaction(operation.coreTx)) {
      map['set_active'] = transaction;
    }

    if (salaryService.isSalaryInductTransaction(operation.coreTx)) {
      map['salary_induct'] = transaction;
    }

    if (salaryService.isSalaryRequestTransaction(operation.coreTx)) {
      map['salary_request'] = transaction;
    }

    if (salaryService.isSalaryPayoutTransaction(operation.coreTx)) {
      map['salary_payout'] = transaction;
    }

    if (evidenceService.isEvidenceTransaction(operation.coreTx)) {
      map['evidence'] = transaction;
    }

    if (votingService.isVotingTransaction(operation.coreTx)) {
      map[`referendum_${operation.coreTx.args.poll}`] = transaction;
    }
  }

  return map;
});

const $salaryTasks = combine(
  {
    member: memberProfile.$member,
    period: memberSalary.$currentPeriod,
    claimStatus: memberSalary.$memberClaimStatus,
    operations: $basketOperationsMap,
  },
  ({ member, period, claimStatus, operations }): TaskDescription[] => {
    if (nullable(member) || !memberService.isCoreMember(member)) return [];
    if (nullable(period) || nullable(claimStatus)) return [];

    if (salaryService.canRequestSalary(claimStatus, period)) {
      return [
        {
          id: 'salary_request',
          weight: 2,
          group: 'personal',
          body: RequestSalary,
          meta: { transaction: operations['salary_request'] ?? null, tags: [] },
        },
      ];
    }

    if (salaryService.canRequestSalaryPayout(claimStatus, period)) {
      return [
        {
          id: 'salary_payout',
          weight: 2,
          group: 'personal',
          body: RequestPayout,
          meta: { transaction: operations['salary_payout'] ?? null, tags: [] },
        },
      ];
    }

    if (!salaryService.isInducted(claimStatus)) {
      return [
        {
          id: 'salary_induct',
          weight: 2,
          group: 'personal',
          body: RequestSalaryInduct,
          meta: { transaction: operations['salary_induct'] ?? null, tags: [] },
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
    operations: $basketOperationsMap,
  },
  ({
    member,
    evidencePopulated,
    leftToPromotion,
    hasPromotionEvidence,
    leftToDemotion,
    hasRetentionEvidence,
    operations,
  }): TaskDescription[] => {
    if (!evidencePopulated || nullable(member) || !memberService.isCoreMember(member)) return [];

    if (nonNullable(leftToDemotion) && leftToDemotion > 0 && hasRetentionEvidence === false) {
      return [
        {
          id: 'evidence',
          weight: 0,
          group: 'personal',
          body: RequestRetention,
          meta: { transaction: operations['evidence'] ?? null, tags: [] },
        },
      ];
    }

    if (nonNullable(leftToPromotion) && leftToPromotion === 0 && hasPromotionEvidence === false) {
      return [
        {
          id: 'evidence',
          weight: 0,
          group: 'personal',
          body: RequestPromotion,
          meta: { transaction: operations['evidence'] ?? null, tags: [] },
        },
      ];
    }

    return [];
  },
);

const $ongoingReferendumsTasks = combine(
  {
    referendums: referendums.$notVotedReferendumns,
    operations: $basketOperationsMap,
    maxRank: $maxRank,
    members: $members,
    member: $member,
    currentBlock: block.$currentBlock,
  },
  ({ referendums, operations, maxRank, members, member, currentBlock }) => {
    if (nullable(member)) return [];

    const groups = groupBy(referendums, referendum => {
      return trackService.isRetentionTrack(referendum.track) || trackService.isPromotionTrack(referendum.track)
        ? 'evidence'
        : 'other';
    });

    const getWeight = (referendum: OngoingReferendum) => {
      const maximumAvailableVotingWeight = tasksService.getMaximumAvailableVotingWeight(
        members,
        maxRank,
        referendum.track,
      );

      const memberVotingWeight = trackService.getVoteWeight({
        pallet: 'fellowship',
        maxRank,
        rank: member.rank,
        track: referendum.track,
      });

      return tasksService.getReferendumImportance({
        referendum,
        maximumAvailableVotingWeight,
        memberVotingWeight,
        currentBlock,
      });
    };

    const evidenceTasks = groups.evidence
      ? groups.evidence.map<TaskDescription>(referendum => {
          const weight = getWeight(referendum);
          return {
            id: `referendum_${referendum.id}`,
            weight: weight.sortingScore,
            group: 'general',
            body: PromotionRetentionVoting,
            meta: { referendum, transaction: operations[`referendum_${referendum.id}`] ?? null, tags: weight.tags },
          };
        })
      : [];

    const otherTasks = groups.other
      ? groups.other.map<TaskDescription>(referendum => {
          const weight = getWeight(referendum);
          return {
            id: `referendum_${referendum.id}`,
            weight: weight.sortingScore,
            group: 'general',
            body: OngoingReferendumVoting,
            meta: { referendum, transaction: operations[`referendum_${referendum.id}`] ?? null, tags: weight.tags },
          };
        })
      : [];

    return [...evidenceTasks, ...otherTasks];
  },
);

const $completedReferendumsTasks = combine(referendums.$completed, referendums => {
  return referendums.map<TaskDescription<{ referendum: CompletedReferendum }>>(referendum => {
    return {
      id: `referendum_completed_${referendum.id}`,
      weight: 1,
      group: 'completed',
      body: CompletedReferendumVoting,
      meta: { referendum, transaction: null, tags: [] },
    };
  });
});

const $list = combine(
  {
    salaryTasks: $salaryTasks,
    referendumTasks: $ongoingReferendumsTasks,
    completedReferendumsTasks: $completedReferendumsTasks,
    evidenceTasks: $evidenceTasks,
    hasPermission: memberProfile.$hasPermission,
  },
  ({ salaryTasks, referendumTasks, completedReferendumsTasks, evidenceTasks, hasPermission }) => {
    if (hasPermission) {
      const list = [...salaryTasks, ...referendumTasks, ...evidenceTasks, ...completedReferendumsTasks];
      return list.sort((a, b) => b.weight - a.weight);
    }

    return [];
  },
);

export const tasks = {
  $chainName,
  $basketOperations: $memberBasketOperations,
  $list,
  pending: or(basketOperations.pending, memberProfile.$pending, evidenceInfo.pending),
};
