import { nullable } from '@/shared/lib/utils';
import {
  type Evidence,
  type Referendum,
  referendumService,
  useTracks as useTracksResource,
} from '@/domains/collectives';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

import { useProposer } from './useProposer';

export const useTracks = (referendum: Referendum | null, evidence?: Evidence | null) => {
  const api = useFellowshipApi();

  const { data: tracks, pending: tracksPending } = useTracksResource({ palletType: 'fellowship', api });
  const { data: proposer, pending: proposerPending } = useProposer(referendum, evidence);
  const { data: member, pending: memberPending } = useFellowshipMember();

  const memberTrack = tracks.find(t => t.id === member?.rank) ?? null;
  const currentProposerTrack = tracks.find(t => t.id === proposer?.rank) ?? null;

  if (nullable(proposer)) return { memberTrack, currentProposerTrack: null, nextProposerTrack: null };

  const index = tracks.findIndex(t => t.id === proposer.rank);

  if (nullable(referendum) || !referendumService.isOngoing(referendum))
    return { memberTrack, currentProposerTrack, nextProposerTrack: null };

  // HINT: promotion can add more than 1 rank
  const nextProposerTrack = tracks.at(index + (referendum.track % 10)) ?? null;
  return {
    currentProposerTrack,
    nextProposerTrack,
    memberTrack,
    pending: tracksPending || proposerPending || memberPending,
  };
};
