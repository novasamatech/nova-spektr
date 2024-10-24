import { combine, createEvent, createStore, restore, sample } from 'effector';
import { debounce } from 'patronum';

import { type TrackId } from '@/shared/pallet/referenda';
import { collectiveDomain } from '@/domains/collectives';

import { fellowshipModel } from './fellowship';
import { referendumsFeatureStatus } from './status';

export type VotingStatus = 'voted' | 'notVoted';

const $tracks = fellowshipModel.$store.map(x => x?.tracks ?? []);

const queryChanged = createEvent<string>();
const selectTracks = createEvent<TrackId[]>();
const selectVotingStatus = createEvent<VotingStatus | null>();
const filtersReset = createEvent();

const $selectedTracks = restore(selectTracks, []);
const $selectedVotingStatus = createStore<VotingStatus | null>(null).on(selectVotingStatus, (v, p) =>
  v === p ? null : p,
);

const $query = restore(debounce(queryChanged, 100), '');

const $isFiltersSelected = combine($selectedTracks, $selectedVotingStatus, (tracks, voteId) => {
  return tracks.length > 0 || voteId !== null;
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
