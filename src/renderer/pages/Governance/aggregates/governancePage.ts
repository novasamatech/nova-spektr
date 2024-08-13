import { combine, sample } from 'effector';
import { createGate } from 'effector-react';
import { either, readonly } from 'patronum';

import { filterModel, listAggregate, listService, networkSelectorModel, titleModel } from '@features/governance';
import { governancePageUtils } from '../lib/governancePageUtils';

const flow = createGate();

const $currentReferendums = listAggregate.$referendums.map((referendums) => {
  return listService.sortReferendums(referendums ?? []);
});

const $referendumsFilteredByQuery = combine(
  { referendums: $currentReferendums, query: filterModel.$debouncedQuery },
  governancePageUtils.filteredByQuery,
);

const $referendumsFilteredByStatus = combine(
  {
    referendums: $currentReferendums,
    selectedVoteId: filterModel.$selectedVoteId,
    selectedTrackIds: filterModel.$selectedTrackIds,
  },
  ({ referendums, selectedVoteId, selectedTrackIds }) => {
    return referendums.filter((referendum) => {
      const filteredByTracks = governancePageUtils.isReferendumInTrack(selectedTrackIds, referendum);
      const filteredByVote = governancePageUtils.isReferendumVoted({
        selectedVoteId,
        referendum,
      });

      return filteredByVote && filteredByTracks;
    });
  },
);

const $displayedCurrentReferendums = either(
  filterModel.$query.map((x) => x.length > 0),
  $referendumsFilteredByQuery,
  $referendumsFilteredByStatus,
);

const $ongoing = $displayedCurrentReferendums.map((x) => x.filter(governancePageUtils.isAggregatedReferendumOngoing));
const $completed = $displayedCurrentReferendums.map((x) =>
  x.filter(governancePageUtils.isAggregatedReferendumCompleted),
);

sample({
  clock: flow.open,
  source: { chain: networkSelectorModel.$governanceChain },
  filter: ({ chain }) => chain === null,
  target: networkSelectorModel.input.defaultChainSet,
});

export const governancePageAggregate = {
  $all: $displayedCurrentReferendums,
  $ongoing: readonly($ongoing),
  $completed: readonly($completed),
  $isLoading: listAggregate.$isLoading,
  $isTitlesLoading: titleModel.$isTitlesLoading,

  gates: {
    flow,
  },
};
