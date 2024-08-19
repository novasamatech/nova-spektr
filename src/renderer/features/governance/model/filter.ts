import { combine, createEvent, createStore, restore, sample } from 'effector';
import { debounce } from 'patronum';

import { type DropdownResult } from '@shared/ui/types';

const queryChanged = createEvent<string>();
const selectedTracksChanged = createEvent<DropdownResult[]>();
const selectedVoteChanged = createEvent<DropdownResult>();
const filtersReset = createEvent();

const $selectedTrackIds = createStore<string[]>([]);
const $selectedVoteId = createStore<string>('');
const $query = restore<string>(queryChanged, '');
const $debouncedQuery = restore<string>(debounce(queryChanged, 100), '');

const $isFiltersSelected = combine($selectedTrackIds, $selectedVoteId, (tracks, voteId) => {
  return tracks.length > 0 || voteId !== '';
});

sample({
  clock: selectedTracksChanged,
  fn: (data) => data.map(({ id }) => id),
  target: $selectedTrackIds,
});

sample({
  clock: selectedVoteChanged,
  source: $selectedVoteId,
  fn: (selectedVoteId, { id }) => {
    if (selectedVoteId === id) {
      return '';
    }

    return id;
  },
  target: $selectedVoteId,
});

sample({
  clock: filtersReset,
  target: [$selectedVoteId.reinit, $selectedTrackIds.reinit],
});

export const filterModel = {
  $query,
  $debouncedQuery,
  $selectedTrackIds,
  $selectedVoteId,
  $isFiltersSelected,

  events: {
    queryChanged,
    selectedTracksChanged,
    selectedVoteChanged,
    filtersReset,
  },
};
