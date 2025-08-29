import { combine } from 'effector';
import { or } from 'patronum';

import { groupBy, nonNullable, nullable } from '@/shared/lib/utils';
import {
  type CompletedReferendum,
  type OngoingReferendum,
  evidence,
  evidenceService,
  member,
  memberService,
  referendumService,
  salaryService,
  trackService,
  votingService,
} from '@/domains/collectives';
import { type BasketTransaction, basketOperations } from '@/aggregates/basket-operations';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { CompletedReferendumVoting } from '../components/tasks/CompletedReferendumVoting';
import { OngoingReferendumVoting } from '../components/tasks/OngoingReferendumVoting';
import { PromotionRetentionEvidenceVoting } from '../components/tasks/PromotionRetentionEvidenceVoting';
import { PromotionRetentionReferendumVoting } from '../components/tasks/PromotionRetentionReferendumVoting';
import { RequestPayout } from '../components/tasks/RequestPayout';
import { RequestPromotion } from '../components/tasks/RequestPromotion';
import { RequestRetention } from '../components/tasks/RequestRetention';
import { RequestSalary } from '../components/tasks/RequestSalary';
import { RequestSalaryInduct } from '../components/tasks/RequestSalaryInduct';
import { tasksService } from '../service';
import { type OperationType, type TaskDescription } from '../types';

import { evidenceModel } from './evidence';
import { fellowshipTasksFeature } from './feature';
import { fellowship } from './fellowship';
import { memberSalary } from './memberSalary';
import { periods } from './periods';
import { referendums } from './referendums';

const ALREADY_VOTED_SORTING_PENALTY = 10_000;

const $chain = fellowshipTasksFeature.input.map(input => input?.chain ?? null);
const $member = fellowshipTasksFeature.input.map(input => input?.member ?? null);
const $evidencePeriods = fellowship.$store.map(store => store?.evidencePeriods ?? null);
const $maxRank = fellowship.$store.map(input => input?.maxRank ?? 0);
const $members = fellowship.$store.map(input => input?.members ?? []);
const $chainName = $chain.map(chain => chain?.name ?? 'Unknown');

const $voting = fellowship.$store.map(store => store?.voting ?? []);
const $accountsVotes = combine({ voting: $voting, account: $member }, ({ voting, account }) => {
  return voting.filter(voting => voting.accountId === account?.accountId);
});

// basket

const $memberBasketOperations = combine(basketOperations.$list, $member, (operations, member) => {
  if (nullable(member)) return [];
  return operations.filter(operation => operation.coreTx.accountId === member.accountId);
});

const $basketOperationsMap = $memberBasketOperations.map(operations => {
  const map: Partial<Record<OperationType, BasketTransaction>> = {};

  for (const operation of operations) {
    if (memberService.isSetActiveTransaction(operation.coreTx)) {
      map['set_active'] = operation;
    }

    if (salaryService.isSalaryInductTransaction(operation.coreTx)) {
      map['salary_induct'] = operation;
    }

    if (salaryService.isSalaryRequestTransaction(operation.coreTx)) {
      map['salary_request'] = operation;
    }

    if (salaryService.isSalaryPayoutTransaction(operation.coreTx)) {
      map['salary_payout'] = operation;
    }

    if (evidenceService.isEvidenceTransaction(operation.coreTx)) {
      map['evidence'] = operation;
    }

    if (votingService.isVotingTransaction(operation.coreTx)) {
      map[`referendum_${operation.coreTx.args.poll}`] = operation;
    }
  }

  return map;
});

const $filteredBasketOperations = $basketOperationsMap.map(map => {
  return Object.values(map).filter(nonNullable);
});

// personal

const $memberSalaryTasks = combine(
  {
    member: $member,
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
          weight: 0,
          group: 'personal',
          body: RequestSalary,
          meta: { transaction: operations['salary_request']?.coreTx ?? null, tags: [] },
        },
      ];
    }

    if (salaryService.canRequestSalaryPayout(claimStatus, period)) {
      return [
        {
          id: 'salary_payout',
          weight: 0,
          group: 'personal',
          body: RequestPayout,
          meta: { transaction: operations['salary_payout']?.coreTx ?? null, tags: [] },
        },
      ];
    }

    if (!salaryService.isInducted(claimStatus)) {
      return [
        {
          id: 'salary_induct',
          weight: 0,
          group: 'personal',
          body: RequestSalaryInduct,
          meta: { transaction: operations['salary_induct']?.coreTx ?? null, tags: [] },
        },
      ];
    }

    return [];
  },
);

const $memberEvidenceTasks = combine(
  {
    member: $member,
    evidencePopulated: evidence.$populated,
    leftToPromotion: periods.$leftToPromotion,
    leftToDemotion: periods.$leftToDemotion,
    hasPromotionEvidence: evidenceModel.$hasPromotionEvidence,
    hasRetentionEvidence: evidenceModel.$hasRetentionEvidence,
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
          weight: 1,
          group: 'personal',
          body: RequestRetention,
          meta: { transaction: operations['evidence']?.coreTx ?? null, tags: [] },
        },
      ];
    }

    if (
      memberService.canPromote(member) &&
      nonNullable(leftToPromotion) &&
      leftToPromotion === 0 &&
      hasPromotionEvidence === false &&
      hasRetentionEvidence === false
    ) {
      return [
        {
          id: 'evidence',
          weight: 1,
          group: 'personal',
          body: RequestPromotion,
          meta: { transaction: operations['evidence']?.coreTx ?? null, tags: [] },
        },
      ];
    }

    return [];
  },
);

// general

const $evidenceTasks = combine(
  {
    evidences: evidenceModel.$evidencesWithoutReferendums,
    periods: $evidencePeriods,
    member: $member,
    members: $members,
    evidencePopulated: evidence.$populated,
    currentBlock: fellowshipNetwork.$currentBlock,
  },
  ({ evidences, periods, member, members, evidencePopulated, currentBlock }) => {
    if (!evidencePopulated || nullable(member) || nullable(periods) || nullable(currentBlock)) {
      return [];
    }

    const tasks: TaskDescription[] = [];

    for (const evidence of evidences) {
      const proposer = members.find(m => m.accountId === evidence.accountId);
      if (nullable(proposer)) continue;

      if (memberService.canVoteForProposal(member, proposer.rank)) {
        const leftToDemotion =
          evidence.wish === 'Retention'
            ? evidenceService.getBlocksUntilDemotion(proposer, periods, currentBlock)
            : null;

        if (nonNullable(leftToDemotion) && leftToDemotion <= 0) continue;

        const endBlock = evidence.wish === 'Retention' ? evidenceService.getEndDemotionBlock(proposer, periods) : null;
        const { tags, sortingScore } = tasksService.getEvidenceImportance(evidence, proposer, periods, currentBlock);

        tasks.push({
          id: `evidence_request_${proposer.accountId}`,
          weight: sortingScore,
          group: 'general',
          body: PromotionRetentionEvidenceVoting,
          meta: { evidence, transaction: null, endBlock, tags },
        });
      }
    }

    return tasks;
  },
);

const $ongoingReferendumsTasks = combine(
  {
    referendums: referendums.$ongoing,
    operations: $basketOperationsMap,
    maxRank: $maxRank,
    members: $members,
    member: $member,
    currentBlock: fellowshipNetwork.$currentBlock,
    accountsVotes: $accountsVotes,
  },
  ({ referendums, operations, maxRank, members, member, currentBlock, accountsVotes }) => {
    if (nullable(member) || nullable(currentBlock)) return [];

    const possibleReferendums = referendums.filter(referendum => {
      // Filter out unknown proposals
      if (referendum.proposal && referendumService.isUnknownProposal(referendum.proposal)) {
        return false;
      }

      return trackService.rankSatisfiesVotingThreshold(member.rank, maxRank, referendum.track);
    });

    const hasUserVoted = (referendum: OngoingReferendum) => {
      return nonNullable(accountsVotes.find(vote => vote.referendumId === referendum.id));
    };

    const groups = groupBy(possibleReferendums, referendum => {
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

      const importance = tasksService.getReferendumImportance({
        referendum,
        maximumAvailableVotingWeight,
        memberVotingWeight,
        currentBlock,
      });

      const sortingScore = hasUserVoted(referendum)
        ? importance.sortingScore - ALREADY_VOTED_SORTING_PENALTY
        : importance.sortingScore;

      return { ...importance, sortingScore };
    };

    const evidenceTasks = groups.evidence
      ? groups.evidence.map<TaskDescription>(referendum => {
          const weight = getWeight(referendum);
          return {
            id: `referendum_${referendum.id}`,
            weight: weight.sortingScore,
            group: 'general',
            body: PromotionRetentionReferendumVoting,
            meta: {
              referendum,
              transaction: operations[`referendum_${referendum.id}`]?.coreTx ?? null,
              tags: weight.tags,
            },
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
            meta: {
              referendum,
              transaction: operations[`referendum_${referendum.id}`]?.coreTx ?? null,
              tags: weight.tags,
            },
          };
        })
      : [];

    return [...evidenceTasks, ...otherTasks];
  },
);

// completed

const $completedReferendumsTasks = combine(referendums.$completed, referendums => {
  return referendums.map<TaskDescription<{ referendum: CompletedReferendum }>>(referendum => {
    return {
      id: `referendum_completed_${referendum.id}`,
      weight: referendum.id,
      group: 'completed',
      body: CompletedReferendumVoting,
      meta: { referendum, transaction: null, tags: [] },
    };
  });
});

// combine

const $list = combine(
  {
    memberSalaryTasks: $memberSalaryTasks,
    memberEvidenceTasks: $memberEvidenceTasks,
    referendumTasks: $ongoingReferendumsTasks,
    completedReferendumsTasks: $completedReferendumsTasks,
    evidenceTasks: $evidenceTasks,
  },
  ({ memberSalaryTasks, memberEvidenceTasks, evidenceTasks, referendumTasks, completedReferendumsTasks }) => {
    const list = [
      ...memberSalaryTasks,
      ...memberEvidenceTasks,
      ...evidenceTasks,
      ...referendumTasks,
      ...completedReferendumsTasks,
    ];
    return list.sort((a, b) => b.weight - a.weight);
  },
);

export const tasks = {
  $chainName,
  $basketOperations: $filteredBasketOperations,
  $list,
  pending: or(basketOperations.pending, member.pending, evidenceModel.requestEvidence.pending),
};
