import { combine } from 'effector';

import { type ReferendumId } from '@/shared/pallet/referenda';
import { type VotingThreshold, referendumService, trackService } from '@/domains/collectives';

import { fellowship } from './fellowship';
import { tracksModel } from './tracks';

type Thresholds = Record<ReferendumId, Record<'support' | 'approval', VotingThreshold>>;

const $referendums = fellowship.$store.map(x => x?.referendums ?? []);
const $maxRank = fellowship.$store.map(x => x?.maxRank ?? 0);
const $members = fellowship.$store.map(x => x?.members ?? []);

const $thresholds = combine(
  {
    referendums: $referendums,
    maxRank: $maxRank,
    members: $members,
    tracks: tracksModel.$list,
  },
  ({ referendums, maxRank, members, tracks }) => {
    const result: Thresholds = {};

    for (const referendum of referendums) {
      if (referendumService.isCompleted(referendum)) continue;

      const track = tracks.find(t => t.id === referendum.track);
      if (!track) {
        continue;
      }

      result[referendum.id] = {
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
    }

    return result;
  },
);

export const thresholdsModel = {
  $thresholds,
};
