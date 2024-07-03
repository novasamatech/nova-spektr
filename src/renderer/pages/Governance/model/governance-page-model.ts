import { combine, sample } from 'effector';
import { createGate } from 'effector-react';

import {
  networkSelectorModel,
  referendumFilterModel,
  referendumListModel,
  referendumListUtils,
} from '@features/governance';
import { governanceModel, referendumUtils } from '@entities/governance';
import { governancePageUtils } from '../lib/governance-page-utils';

const governanceFlow = createGate();

const $currentReferendums = combine(
  {
    referendums: governanceModel.$referendums,
    chain: referendumListModel.$chain,
  },
  ({ referendums, chain }) => {
    return chain ? referendumListUtils.getSortedReferendums(referendums[chain.chainId] ?? []) : [];
  },
);

const $currentDetails = combine(
  {
    titles: referendumListModel.$referendumsTitles,
    chain: referendumListModel.$chain,
  },
  ({ titles, chain }) => {
    return chain ? titles[chain.chainId] ?? {} : {};
  },
);

const $referendumsFilteredByQuery = combine(
  {
    referendums: $currentReferendums,
    details: $currentDetails,
    query: referendumFilterModel.$query,
  },
  ({ referendums, details, query }) => {
    return governancePageUtils.filteredByQuery({
      referendums,
      query,
      details,
    });
  },
);

const $referendumsFilteredByStatus = combine(
  {
    referendums: $currentReferendums,
    selectedVoteId: referendumFilterModel.$selectedVoteId,
    selectedTrackIds: referendumFilterModel.$selectedTrackIds,
    voting: governanceModel.$voting,
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

const $displayedCurrentReferendums = combine(
  {
    filtered: $referendumsFilteredByStatus,
    filteredByQuery: $referendumsFilteredByQuery,
    query: referendumFilterModel.$query,
  },
  ({ filtered, filteredByQuery, query }) => (query === '' ? filtered : filteredByQuery),
);

const $ongoing = $displayedCurrentReferendums.map((x) => x.filter(referendumUtils.isOngoing));
const $completed = $displayedCurrentReferendums.map((x) => x.filter(referendumUtils.isCompleted));

sample({
  clock: governanceFlow.open,
  source: { chain: networkSelectorModel.$governanceChain },
  filter: ({ chain }) => !chain,
  target: networkSelectorModel.input.defaultChainSet,
});

export const governancePageModel = {
  $ongoing: $ongoing,
  $completed: $completed,

  gates: {
    governanceFlow,
  },
};
