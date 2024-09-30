import { combine, sample } from 'effector';
import { and, either, or } from 'patronum';

import { performSearch } from '@shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { filterModel } from './filter';
import { referendumsFeatureStatus } from './status';

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

const $referendumsFilteredByQuery = combine($referendums, filterModel.$debouncedQuery, (referendums, query) => {
  return performSearch({
    records: referendums,
    query,
    weights: {
      // title: 1,
      id: 0.5,
    },
  });
});

const $referendumsFilteredByStatus = combine(
  {
    referendums: $referendums,
    selectedTracks: filterModel.$selectedTracks,
  },
  ({ referendums, selectedTracks }) => {
    return referendums.filter(referendum => {
      const isInTrack = collectiveDomain.referendum.service.isReferendumInTrack(selectedTracks, referendum);

      // TODO add filtering by voting status

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
