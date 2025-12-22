import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import {
  type Referendum,
  type VotingThreshold,
  referendumService,
  trackService,
  useMaxRank,
  useMembers,
  useTracks,
} from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useThreshold = (referendum: Referendum | null) => {
  const api = useFellowshipApi();
  const { data: members, pending: pendingMembers } = useMembers({ palletType: 'fellowship', api });
  const { data: tracks, pending: pendingTracks } = useTracks({ palletType: 'fellowship', api });
  const { data: maxRank, pending: pendingMaxRank } = useMaxRank({ palletType: 'fellowship', api });

  const threshold = useMemo<Record<'support' | 'approval', VotingThreshold> | null>(() => {
    if (nullable(maxRank) || nullable(referendum)) {
      return null;
    }

    if (referendumService.isCompleted(referendum)) {
      return null;
    }

    const track = tracks.find(t => t.id === referendum.track);
    if (nullable(track)) {
      return null;
    }

    return {
      support: trackService.supportThreshold({
        track,
        maxRank,
        members,
        tally: referendum.tally,
      }),
      approval: trackService.approvalThreshold({
        track,
        maxRank,
        tally: referendum.tally,
      }),
    };
  }, [referendum, tracks, maxRank, members]);

  return { data: threshold, pending: pendingMembers || pendingTracks || pendingMaxRank };
};
