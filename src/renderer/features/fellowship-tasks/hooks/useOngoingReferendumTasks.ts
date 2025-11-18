import { groupBy, nonNullable } from '@/shared/lib/utils';
import { type OngoingReferendum, referendumService, trackService, useMaxRank, useMembers } from '@/domains/collectives';
import { useFellowshipMember, useFellowshipMemberVotes } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipBlock } from '@/aggregates/fellowship-network';
import { OngoingReferendumVoting } from '../components/tasks/OngoingReferendumVoting';
import { PromotionRetentionReferendumVoting } from '../components/tasks/PromotionRetentionReferendumVoting';
import { tasksService } from '../service';
import { type TaskDescription } from '../types';

import { useMemberBasketOperations } from './useMemberBasketOperations';
import { useOngoingReferendums } from './useOngoingReferendums';

export const useOngoingReferendumTasks = () => {
  const api = useFellowshipApi();

  const { data: member, pending: pendingMember } = useFellowshipMember();
  const { data: currentBlock, pending: pendingBlock } = useFellowshipBlock();

  const { data: operations, pending: pendingOperations } = useMemberBasketOperations();

  const { data: members } = useMembers({ palletType: 'fellowship', api });
  const { data: maxRank } = useMaxRank({ palletType: 'fellowship', api });

  const { data: referendums, pending: pendingReferendums } = useOngoingReferendums();
  const { data: votes, pending: pendingVotes } = useFellowshipMemberVotes(referendums.map(referendum => referendum.id));

  let tasks: TaskDescription[] = [];

  if (nonNullable(member) && nonNullable(currentBlock) && nonNullable(maxRank)) {
    const possibleReferendums = referendums.filter(referendum => {
      // Filter out unknown proposals
      if (!referendum.proposal || referendumService.isUnknownProposal(referendum.proposal)) {
        return false;
      }

      return trackService.rankSatisfiesVotingThreshold(member.rank, maxRank, referendum.track);
    });

    const hasUserVoted = (referendum: OngoingReferendum) => {
      return nonNullable(votes.find(vote => vote.referendumId === referendum.id));
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
            group: 'general',
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
            hasVoted: hasUserVoted(referendum),
          };
        })
      : [];

    tasks = [...evidenceTasks, ...otherTasks];
  }

  return {
    data: tasks,
    pending: pendingMember || pendingBlock || pendingOperations || pendingReferendums || pendingVotes,
  };
};
