import { useMemo } from 'react';

import { nonNullable, nullable } from '@/shared/lib/utils';
import {
  evidenceService,
  memberService,
  referendumService,
  trackService,
  useEvidencePeriod,
  useEvidenceToReferendumRelations,
  useEvidences,
  useMembers,
  votingService,
} from '@/domains/collectives';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipBlock, useFellowshipChain } from '@/aggregates/fellowship-network';
import { PromotionRetentionEvidenceVoting } from '../components/tasks/PromotionRetentionEvidenceVoting';
import { tasksService } from '../service';
import { type TaskDescription } from '../types';

import { useMemberBasketOperations } from './useMemberBasketOperations';
import { useOngoingReferendums } from './useOngoingReferendums';

const useEvidencesWithoutReferendums = () => {
  const api = useFellowshipApi();
  const { data: referendums, pending: pendingReferendums } = useOngoingReferendums();
  const { data: members, pending: pendingMembers } = useMembers({ palletType: 'fellowship', api });
  const { data: evidences, pending: pendingEvidences } = useEvidences({
    palletType: 'fellowship',
    api,
    accounts: members.map(m => m.accountId),
  });

  const proposers = useMemo(() => {
    return referendums
      .map(r => {
        return trackService.isPromotionTrack(r.track) || trackService.isRetentionTrack(r.track)
          ? referendumService.getProposer(r)
          : null;
      })
      .filter(nonNullable);
  }, [referendums]);

  const result = useMemo(() => {
    return evidences.filter(evidence => {
      return nullable(proposers.find(p => p === evidence.accountId));
    });
  }, [evidences, proposers]);

  return { data: result, pending: pendingEvidences || pendingReferendums || pendingMembers };
};

export const useEvidenceTasks = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: block, pending: pendingBlock } = useFellowshipBlock();
  const { data: member, pending: pendingMember } = useFellowshipMember();
  const { data: evidences, pending: pendingEvidences } = useEvidencesWithoutReferendums();
  const { data: periods, pending: pendingPeriod } = useEvidencePeriod({ palletType: 'fellowship', api, chain });
  const { data: members, pending: pendingMembers } = useMembers({ palletType: 'fellowship', api });
  const { data: basketOperation } = useMemberBasketOperations();

  const { data: evidenceToReferendumRelations, pending: pendingRelations } = useEvidenceToReferendumRelations({
    palletType: 'fellowship',
    chain,
  });

  const tasks: TaskDescription[] = [];

  if (nonNullable(member) && nonNullable(periods) && nonNullable(block)) {
    const evidenceHashesWithReferendums = new Set(
      evidenceToReferendumRelations.flatMap(r => r.evidence.map(e => e.hash)),
    );

    for (const evidence of evidences) {
      if (evidenceHashesWithReferendums.has(evidence.hash)) {
        continue;
      }

      const proposer = members.find(m => m.accountId === evidence.accountId);
      if (nullable(proposer)) continue;

      if (memberService.canVoteForProposal(member, proposer.rank)) {
        const leftToDemotion =
          evidence.wish === 'Retention' ? evidenceService.getBlocksUntilDemotion(proposer, periods, block) : null;

        if (nonNullable(leftToDemotion) && leftToDemotion <= 0) continue;

        const endBlock = evidence.wish === 'Retention' ? evidenceService.getEndDemotionBlock(proposer, periods) : null;
        const { tags, sortingScore } = tasksService.getEvidenceImportance(evidence, proposer, periods, block);

        const evidenceTransaction =
          Object.values(basketOperation).find(o => {
            if (!o) return false;
            return votingService.isEvidenceVotingTransaction(o.coreTx) && o.initiatorAccountId === member.accountId;
          })?.coreTx ?? null;

        tasks.push({
          id: `evidence_request_${proposer.accountId}`,
          weight: sortingScore,
          group: 'general',
          body: PromotionRetentionEvidenceVoting,
          meta: { evidence, transaction: evidenceTransaction, endBlock, tags },
          hasVoted: false,
        });
      }
    }
  }

  return {
    data: tasks,
    pending: pendingBlock || pendingEvidences || pendingPeriod || pendingMember || pendingMembers || pendingRelations,
  };
};
