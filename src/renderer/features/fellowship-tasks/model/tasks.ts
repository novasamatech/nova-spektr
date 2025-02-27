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
import { RequestPromotion } from '../components/tasks/RequestPromotion';
import { RequestRetention } from '../components/tasks/RequestRetention';
import { RequestSalary } from '../components/tasks/RequestSalary';
import { RequestSalaryInduct } from '../components/tasks/RequestSalaryInduct';
import { type OperationType, type TaskDescription } from '../types';

import { evidenceInfo } from './evidence';
import { fellowshipTasksFeature } from './feature';
import { memberSalary } from './memberSalary';
import { profile } from './profile';
import { referendums } from './referendums';

const $chain = fellowshipTasksFeature.input.map(input => input?.chain ?? null);
const $chainName = $chain.map(chain => chain?.name ?? 'Unknown');

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
  {
    member: profile.$member,
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

    if (!salaryService.isInducted(claimStatus)) {
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

const $evidenceTasks = combine(
  {
    member: profile.$member,
    evidencePopulated: evidenceInfo.$evidencePopulated,
    leftToPromotion: evidenceInfo.$leftToPromotion,
    leftToDemotion: evidenceInfo.$leftToDemotion,
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
          body: RequestPromotion,
          meta: {},
        },
      ];
    }

    return [];
  },
);

const $referendumTasks = combine(referendums.$notVotedReferendumns, referendums => {
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
    evidenceTasks: $evidenceTasks,
    operations: $basketOperationsIds,
    hasPermission: $hasPermission,
  },
  ({ salaryTasks, referendumTasks, evidenceTasks, operations, hasPermission }) => {
    if (hasPermission) {
      const operationsMap = toKeysRecord(operations);
      return [...salaryTasks, ...referendumTasks, ...evidenceTasks]
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
  $chainName,
  $basketOperations,
  $list,
};
