import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { dictionary, groupBy, nonNullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import {
  type OngoingReferendum,
  referendumService,
  trackService,
  useMaxRank,
  useMembers,
  useReferendumsMapToGovernance,
} from '@/domains/collectives';
import { useReferendumSummary } from '@/domains/governance';
import { useFellowshipMember, useFellowshipMemberVotes } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipBlock, useFellowshipChain } from '@/aggregates/fellowship-network';
import { governancePageAggregate } from '@/pages/Governance/aggregates/governancePage';
import { OngoingReferendumVoting } from '../components/tasks/OngoingReferendumVoting';
import { PromotionRetentionReferendumVoting } from '../components/tasks/PromotionRetentionReferendumVoting';
import { tasksService } from '../service';
import { type TaskDescription } from '../types';

import { useMemberBasketOperations } from './useMemberBasketOperations';
import { useOngoingReferendums } from './useOngoingReferendums';

export const useOngoingReferendumTasks = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: member, pending: pendingMember } = useFellowshipMember();
  const { data: currentBlock, pending: pendingBlock } = useFellowshipBlock();

  const { data: operations, pending: pendingOperations } = useMemberBasketOperations();

  const { data: members } = useMembers({ palletType: 'fellowship', api });
  const { data: maxRank } = useMaxRank({ palletType: 'fellowship', api });

  const { data: referendums, pending: pendingReferendums } = useOngoingReferendums();
  const { data: votes, pending: pendingVotes } = useFellowshipMemberVotes(referendums.map(referendum => referendum.id));

  const { data: referendumsMapToGovernance, pending: pendingReferendumsMapToGovernance } =
    useReferendumsMapToGovernance({
      chain,
      palletType: 'fellowship',
    });

  const currentGovernanceReferendums = useUnit(governancePageAggregate.$currentReferendums);

  const governanceReferendumsById = useMemo(() => {
    return dictionary(currentGovernanceReferendums, 'referendumId');
  }, [currentGovernanceReferendums]);

  // Batch fetch governance referendum summaries
  const { governanceChainId, governanceReferendumIds } = useMemo(() => {
    const connected = Object.values(referendumsMapToGovernance).filter(nonNullable);
    const chainId = connected[0]?.chainId ?? null;
    const ids = connected.map(c => c.referendumId);
    return { governanceChainId: chainId, governanceReferendumIds: ids };
  }, [referendumsMapToGovernance]);

  const { data: governanceReferendumSummaries } = useReferendumSummary({
    chainId: governanceChainId,
    referendumIds: governanceReferendumIds,
  });

  const tasks = useMemo<TaskDescription[]>(() => {
    if (!nonNullable(member) || !nonNullable(currentBlock) || !nonNullable(maxRank)) {
      return [];
    }

    const possibleReferendums = referendums.filter(referendum => {
      if (!referendum.proposal || referendumService.isUnknownProposal(referendum.proposal)) {
        return false;
      }

      return trackService.rankSatisfiesVotingThreshold(member.rank, maxRank, referendum.track);
    });

    const hasUserVoted = (referendum: OngoingReferendum) => {
      return nonNullable(votes.find(vote => vote.referendumId === referendum.id));
    };

    const filteredReferendums = possibleReferendums.filter(referendum =>
      tasksService.isRetentionReferendumAllowed({ referendum, members }),
    );

    const groups = groupBy(filteredReferendums, referendum => {
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
        hasUserVoted: hasUserVoted(referendum),
      });
    };

    const evidenceTasks = groups.evidence
      ? groups.evidence.map<TaskDescription>(referendum => {
          const weight = getWeight(referendum);

          return {
            id: `referendum_${referendum.id}`,
            weight: weight.sortingScore,
            group: 'active',
            body: PromotionRetentionReferendumVoting,
            meta: {
              referendum,
              transaction: operations[`referendum_${referendum.id}`]?.coreTx ?? null,
              tags: weight.tags,
            },
            hasVoted: hasUserVoted(referendum),
          };
        })
      : [];

    const otherTasks = groups.other
      ? groups.other.map<TaskDescription>(referendum => {
          const connectedReferendumRelation = referendumsMapToGovernance[referendum.id] ?? null;
          const connectedGovernanceReferendumId = connectedReferendumRelation?.referendumId;
          const connectedGovernanceReferendum = connectedGovernanceReferendumId
            ? governanceReferendumsById[connectedGovernanceReferendumId]
            : null;

          const referendumWithLowerEndBlock =
            nonNullable(connectedGovernanceReferendum) && nonNullable(connectedGovernanceReferendum.end)
              ? {
                  ...referendum,
                  ends: pjsSchema.helpers.toBlockHeight(Math.min(referendum.ends, connectedGovernanceReferendum.end)),
                }
              : referendum;

          const weight = getWeight(referendumWithLowerEndBlock);

          const connectedSummary = connectedGovernanceReferendumId
            ? (governanceReferendumSummaries?.[connectedGovernanceReferendumId]?.summary ?? null)
            : null;

          return {
            id: `referendum_${referendumWithLowerEndBlock.id}`,
            weight: weight.sortingScore,
            group: 'active',
            body: OngoingReferendumVoting,
            meta: {
              referendum: referendumWithLowerEndBlock,
              transaction: operations[`referendum_${referendumWithLowerEndBlock.id}`]?.coreTx ?? null,
              tags: weight.tags,
              connectedGovernanceReferendumSummary: connectedSummary,
            },
            hasVoted: hasUserVoted(referendumWithLowerEndBlock),
          };
        })
      : [];

    return [...evidenceTasks, ...otherTasks];
  }, [
    member,
    currentBlock,
    maxRank,
    referendums,
    votes,
    members,
    operations,
    governanceReferendumsById,
    referendumsMapToGovernance,
    governanceReferendumSummaries,
  ]);

  return {
    data: tasks,
    pending:
      pendingMember ||
      pendingBlock ||
      pendingOperations ||
      pendingReferendums ||
      pendingVotes ||
      pendingReferendumsMapToGovernance,
  };
};
