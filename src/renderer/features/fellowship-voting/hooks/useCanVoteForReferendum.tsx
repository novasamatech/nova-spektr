import { nonNullable } from '@/shared/lib/utils';
import { type Referendum, referendumService, trackService, useMaxRank } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { useFellowshipAccount, useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useCanVoteForReferendum = (referendum: Referendum | null) => {
  const api = useFellowshipApi();
  const { data: account } = useFellowshipAccount();
  const { data: maxRank } = useMaxRank({ palletType: 'fellowship', api });
  const { data: currentMember } = useFellowshipMember();

  const canVote = account ? accountService.hasPermissionToMakeActions(account) : false;

  const hasRequiredRank =
    nonNullable(referendum) &&
    nonNullable(maxRank) &&
    nonNullable(currentMember) &&
    referendumService.isOngoing(referendum) &&
    trackService.rankSatisfiesVotingThreshold(currentMember.rank, maxRank, referendum.track);

  return canVote && hasRequiredRank;
};
