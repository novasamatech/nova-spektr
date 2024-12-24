import { combine, createEvent, restore, sample } from 'effector';
import { readonly } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';
import { type TrackId } from '@/shared/pallet/referenda';
import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { referendumsFeatureStatus } from './status';

const $tracks = fellowshipModel.$store.map(x => x?.tracks ?? []);

const queryChanged = createEvent<string>();
const selectTracks = createEvent<TrackId[]>();
const selectVotingStatus = createEvent<null | 'voted' | 'notVoted'>();
const filtersReset = createEvent();

const $query = restore(queryChanged, '');
const $selectedTracks = restore(selectTracks, []);
const $selectedVotingStatus = restore(selectVotingStatus, null);

const $isFiltersSelected = combine($selectedTracks, $selectedVotingStatus, (tracks, voteId) => {
  return tracks.length > 0 || nonNullable(voteId);
});

sample({
  clock: filtersReset,
  target: [$selectedVotingStatus.reinit, $selectedTracks.reinit],
});

sample({
  clock: referendumsFeatureStatus.running,
  target: collectiveDomain.tracks.request,
});

export const filterModel = {
  $query: readonly($query),
  $tracks,
  $selectedTracks: readonly($selectedTracks),
  $selectedVotingStatus: readonly($selectedVotingStatus),
  $isFiltersSelected: readonly($isFiltersSelected),

  events: {
    queryChanged,
    selectTracks,
    selectVotingStatus,
    filtersReset,
  },
};
