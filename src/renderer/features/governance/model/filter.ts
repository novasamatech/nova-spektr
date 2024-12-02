import { combine, createEvent, restore, sample } from 'effector';
import { debounce } from 'patronum';

import { nonNullable } from '@/shared/lib/utils';

const queryChanged = createEvent<string>();
const selectedTracksChanged = createEvent<string[]>();
const selectedVoteChanged = createEvent<null | 'voted' | 'notVoted'>();
const filtersReset = createEvent();

const $query = restore(queryChanged, '');
const $selectedTrackIds = restore(selectedTracksChanged, []);
const $selectedVoteId = restore(selectedVoteChanged, null);
const $debouncedQuery = restore(debounce(queryChanged, 100), '');

const $isFiltersSelected = combine($selectedTrackIds, $selectedVoteId, (tracks, voteId) => {
  return tracks.length > 0 || nonNullable(voteId);
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
