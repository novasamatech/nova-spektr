import { nullable } from '@/shared/lib/utils';
import { type OngoingReferendum, trackService, useMaxRank } from '@/domains/collectives';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { tasksService } from '@/features/fellowship-tasks';

import { useReferendumVote } from './useReferendumVote';

export const useMemberVoteInfo = (referendum: OngoingReferendum | null) => {
  const api = useFellowshipApi();
  const { data: currentMember } = useFellowshipMember();
  const { data: maxRank } = useMaxRank({ palletType: 'fellowship', api });
  const { data: referendumVote } = useReferendumVote(referendum);

  if (nullable(currentMember) || nullable(maxRank) || nullable(referendum) || nullable(referendumVote))
    return {
      memberVoteWeight: null,
      hasRequiredRank: null,
      userVotesImpact: null,
    };

  const memberVoteWeight = trackService.getVoteWeight({
    pallet: 'fellowship',
    rank: currentMember.rank,
    maxRank: maxRank,
    track: referendum.track,
  });

  const hasRequiredRank = trackService.rankSatisfiesVotingThreshold(currentMember.rank, maxRank, referendum.track);

  const totalReferendumVotes = referendum.tally.ayes + referendum.tally.nays;
  const userVotesImpact =
    tasksService.getReferendumUserImportanceScore(
      totalReferendumVotes,
      referendumVote?.decision ? memberVoteWeight * 2 : memberVoteWeight,
    ) * 100;

  return {
    memberVoteWeight,
    hasRequiredRank,
    userVotesImpact,
  };
};
