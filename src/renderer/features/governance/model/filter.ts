import { createEvent, createStore, restore, sample } from 'effector';
import { debounce } from 'patronum';

import { type DropdownResult } from '@shared/ui/types';

const queryChanged = createEvent<string>();
const selectedTracksChanged = createEvent<DropdownResult[]>();
const selectedVoteChanged = createEvent<DropdownResult>();

const $selectedTrackIds = createStore<string[]>([]);
const $selectedVoteId = createStore<string>('');
const $query = restore<string>(queryChanged, '');
const $debouncedQuery = restore<string>(debounce(queryChanged, 100), '');

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

export const filterModel = {
  $query,
  $debouncedQuery,
  $selectedTrackIds,
  $selectedVoteId,
  events: {
    queryChanged,
    selectedTracksChanged,
    selectedVoteChanged,
  },
};
