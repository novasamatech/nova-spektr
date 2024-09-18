import { combine, createEvent, createStore, restore, sample } from 'effector';
import { debounce } from 'patronum';

import { type TrackId } from '@shared/pallet/referenda';
import { type DropdownResult } from '@shared/ui/types';

const queryChanged = createEvent<string>();
const selectTracks = createEvent<DropdownResult<number>[]>();
const selectVotingStatus = createEvent<DropdownResult>();
const filtersReset = createEvent();

const $selectedTracks = createStore<TrackId[]>([]);
const $selectedVotingStatus = createStore<string>('');
const $query = restore<string>(queryChanged, '');
const $debouncedQuery = restore<string>(debounce(queryChanged, 100), '');

const $isFiltersSelected = combine($selectedTracks, $selectedVotingStatus, (tracks, voteId) => {
  return tracks.length > 0 || voteId !== '';
});

sample({
  clock: selectTracks,
  fn: data => data.map(({ value }) => value),
  target: $selectedTracks,
});

sample({
  clock: selectVotingStatus,
  source: $selectedVotingStatus,
  fn: (selectedVoteId, { id }) => (selectedVoteId === id ? '' : id),
  target: $selectedVotingStatus,
});

sample({
  clock: filtersReset,
  target: [$selectedVotingStatus.reinit, $selectedTracks.reinit],
});

export const filterModel = {
  $query,
  $debouncedQuery,
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
