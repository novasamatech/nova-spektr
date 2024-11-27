import { combine, createEvent, restore, sample } from 'effector';
import { debounce } from 'patronum';

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

const $query = restore(debounce(queryChanged, 100), '');
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
  $query,
  $tracks,
  $selectedTracks,
  $selectedVotingStatus,
  $isFiltersSelected,

  events: {
    queryChanged,
    selectTracks,
    selectVotingStatus,
    filtersReset,
  },
};
