import { combine } from 'effector';

import { type ReferendumId } from '@/shared/pallet/referenda';
import { type VotingThreshold, collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { tracksModel } from './tracks';

type Thresholds = Record<ReferendumId, Record<'support' | 'approval', VotingThreshold>>;

const $referendums = fellowshipModel.$store.map(x => x?.referendums ?? []);
const $maxRank = fellowshipModel.$store.map(x => x?.maxRank ?? 0);
const $members = fellowshipModel.$store.map(x => x?.members ?? []);

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
      if (collectiveDomain.referendumService.isCompleted(referendum)) continue;

      const track = tracks.find(t => t.id === referendum.track);
      if (!track) {
        continue;
      }

      result[referendum.id] = {
        support: collectiveDomain.tracksService.supportThreshold({
          track,
          maxRank,
          members,
          tally: referendum.tally,
        }),
        approval: collectiveDomain.tracksService.approvalThreshold({
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
