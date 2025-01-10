import { combine, restore, sample } from 'effector';
import { and, debounce, either, or } from 'patronum';

import { attachToFeatureInput } from '@/shared/effector';
import { dictionary, nonNullable, performSearch } from '@/shared/lib/utils';
import { collectiveDomain } from '@/domains/collectives';
import { governanceModel } from '@/entities/governance';

import { fellowshipModel } from './fellowship';
import { filterModel } from './filter';
import { referendumsFeatureStatus } from './status';
import { votingModel } from './voting';

// TODO do smth about it, this connection looks terrible
const metadataProviderUpdated = attachToFeatureInput(referendumsFeatureStatus, governanceModel.$governanceApi);

const $deboucedQuery = restore(debounce(filterModel.$query, 300), '');

sample({
  clock: metadataProviderUpdated,
  filter: ({ data }) => nonNullable(data),
  fn: ({ input: { chainId, palletType }, data: api }) => ({
    provider: api!.type,
    chainId,
    palletType,
  }),
  target: collectiveDomain.referendumMeta.request,
});

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
  { referendums: $referendums, meta: $meta, query: $deboucedQuery },
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
    voting: votingModel.$accountsVoting,
  },
  ({ referendums, voting, selectedTracks, selectedVotingStatus }) => {
    const votingMap = dictionary(voting, 'referendumId');

    return referendums.filter(referendum => {
      const isInTrack = collectiveDomain.referendumService.isReferendumInTrack(selectedTracks, referendum);

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

const $ongoing = $filteredReferendum.map(collectiveDomain.referendumService.getOngoingReferendums);
const $completed = $filteredReferendum.map(collectiveDomain.referendumService.getCompletedReferendums);

export const referendumListModel = {
  $referendums,
  $filteredReferendum,
  $ongoing,
  $completed,
  $meta,
  $pending: or(collectiveDomain.referendum.pending, referendumsFeatureStatus.isStarting),
  $fulfilled: and(collectiveDomain.referendum.fulfilled, referendumsFeatureStatus.isRunning),
};
