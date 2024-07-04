import { combine, sample } from 'effector';
import { createGate } from 'effector-react';
import { either } from 'patronum';

import {
  referendumModel,
  networkSelectorModel,
  referendumFilterModel,
  listService,
  titleModel,
} from '@features/governance';
import { referendumUtils, votingModel } from '@entities/governance';
import { governancePageUtils } from '../lib/governance-page-utils';

const governanceFlow = createGate();

const $currentReferendums = combine(
  {
    referendums: referendumModel.$referendums,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ referendums, chain }) => {
    return chain ? listService.sortReferendums(referendums[chain.chainId] ?? []) : [];
  },
);

const $titles = combine(
  {
    titles: titleModel.$titles,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ titles, chain }) => {
    return chain ? titles[chain.chainId] ?? {} : {};
  },
);

const $referendumsFilteredByQuery = combine(
  {
    referendums: $currentReferendums,
    titles: $titles,
    query: referendumFilterModel.$debouncedQuery,
  },
  ({ referendums, titles, query }) => {
    return governancePageUtils.filteredByQuery({
      referendums,
      query,
      details: titles,
    });
  },
);

const $referendumsFilteredByStatus = combine(
  {
    referendums: $currentReferendums,
    selectedVoteId: referendumFilterModel.$selectedVoteId,
    selectedTrackIds: referendumFilterModel.$selectedTrackIds,
    voting: votingModel.$voting,
  },
  ({ referendums, selectedVoteId, voting, selectedTrackIds }) => {
    return referendums.filter((referendum) => {
      const filteredByVote = governancePageUtils.filterByVote({
        selectedVoteId,
        referendumId: referendum.referendumId,
        voting,
      });
      const filteredByTracks = governancePageUtils.filterByTracks(selectedTrackIds, referendum);

      return filteredByVote && filteredByTracks;
    });
  },
);

const $displayedCurrentReferendums = either(
  referendumFilterModel.$query.map((x) => x.length > 0),
  $referendumsFilteredByQuery,
  $referendumsFilteredByStatus,
);

const $ongoing = $displayedCurrentReferendums.map((x) => x.filter(referendumUtils.isOngoing));
const $completed = $displayedCurrentReferendums.map((x) => x.filter(referendumUtils.isCompleted));

sample({
  clock: governanceFlow.open,
  source: { chain: networkSelectorModel.$governanceChain },
  filter: ({ chain }) => chain === null,
  target: networkSelectorModel.input.defaultChainSet,
});

export const governancePageModel = {
  $ongoing: $ongoing,
  $completed: $completed,

  gates: {
    governanceFlow,
  },
};
