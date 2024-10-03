import { combine, createEvent, createStore, restore, sample } from 'effector';
import { debounce } from 'patronum';

import { type TrackId } from '@/shared/pallet/referenda';

export type VotingStatus = 'voted' | 'notVoted';

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

export const filterModel = {
  $query,
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
