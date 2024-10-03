import { combine, sample } from 'effector';
import { and, either, or } from 'patronum';

import { dictionary, performSearch } from '@shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { filterModel } from './filter';
import { referendumsFeatureStatus } from './status';
import { votingModel } from './voting';

sample({
  clock: referendumsFeatureStatus.running,
  target: [collectiveDomain.referendum.subscribe, collectiveDomain.referendumMeta.request],
});

sample({
  clock: referendumsFeatureStatus.stopped,
  target: collectiveDomain.referendum.unsubscribe,
});

const $referendums = fellowshipModel.$store.map(store => store?.referendums ?? []);
const $meta = fellowshipModel.$store.map(store => store?.referendumMeta ?? {});

const $referendumsFilteredByQuery = combine(
  { referendums: $referendums, meta: $meta, query: filterModel.$query },
  ({ referendums, meta, query }) => {
    return performSearch({
      records: referendums,
      getMeta: referendum => ({
        title: meta[referendum.id]?.title ?? '',
      }),
      query,
      weights: {
        title: 1,
        id: 0.5,
      },
    });
  },
);

const $referendumsFilteredByStatus = combine(
  {
    referendums: $referendums,
    selectedTracks: filterModel.$selectedTracks,
    selectedVotingStatus: filterModel.$selectedVotingStatus,
    voting: votingModel.$walletVoting,
  },
  ({ referendums, voting, selectedTracks, selectedVotingStatus }) => {
    const votingMap = dictionary(voting, 'referendumId');

    return referendums.filter(referendum => {
      const isInTrack = collectiveDomain.referendum.service.isReferendumInTrack(selectedTracks, referendum);

      if (selectedVotingStatus === 'voted') {
        return isInTrack && referendum.id in votingMap;
      }

      if (selectedVotingStatus === 'notVoted') {
        return isInTrack && !(referendum.id in votingMap);
      }

      return isInTrack;
    });
  },
);

const $filteredReferendum = either(
  filterModel.$query.map(x => x.length > 0),
  $referendumsFilteredByQuery,
  $referendumsFilteredByStatus,
);

const $ongoing = $filteredReferendum.map(collectiveDomain.referendum.service.getOngoingReferendums);
const $completed = $filteredReferendum.map(collectiveDomain.referendum.service.getCompletedReferendums);

export const referendumListModel = {
  $referendums,
  $filteredReferendum,
  $ongoing,
  $completed,
  $meta,
  $pending: or(collectiveDomain.referendum.pending, referendumsFeatureStatus.isStarting),
  $fulfulled: and(collectiveDomain.referendum.fulfilled, referendumsFeatureStatus.isRunning),
};
