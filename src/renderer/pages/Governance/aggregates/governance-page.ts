import { combine, sample } from 'effector';
import { createGate } from 'effector-react';
import { either, readonly } from 'patronum';

import { listAggregate, networkSelectorModel, filterModel, listService } from '@features/governance';
import { votingModel } from '@entities/governance';
import { governancePageUtils } from '../lib/governance-page-utils';

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
    voting: votingModel.$voting,
  },
  ({ referendums, selectedVoteId, voting, selectedTrackIds }) => {
    return referendums.filter(({ referendum }) => {
      const filteredByTracks = governancePageUtils.isReferendumInTrack(selectedTrackIds, referendum);
      const filteredByVote = governancePageUtils.isReferendumVoted({
        selectedVoteId,
        referendumId: referendum.referendumId,
        voting,
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
  $ongoing: readonly($ongoing),
  $completed: readonly($completed),
  $isLoading: listAggregate.$isLoading,

  gates: {
    flow,
  },
};
