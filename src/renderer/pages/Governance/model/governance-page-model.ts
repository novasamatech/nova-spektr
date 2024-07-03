import { combine, createEvent, createStore, sample } from 'effector';

import type { ReferendumId, Chain, OngoingReferendum, CompletedReferendum } from '@shared/core';
import { governanceModel } from '@entities/governance';
import { networkSelectorModel, referendumFilterModel, referendumListModel } from '@features/governance';
import { governancePageUtils } from '../lib/governance-page-utils';

const flowStarted = createEvent();
const referendumSelected = createEvent<ReferendumId>();

const $ongoing = createStore<Map<ReferendumId, OngoingReferendum>>(new Map());
const $completed = createStore<Map<ReferendumId, CompletedReferendum>>(new Map());

const $ongoingFilteredByQuery = combine(
  {
    referendums: governanceModel.$ongoingReferendums,
    query: referendumFilterModel.$query,
    details: referendumListModel.$referendumsDetails,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ referendums, details, chain, query }) => {
    return governancePageUtils.filteredByQuery({ referendums, query, details, chainId: chain?.chainId });
  },
);

const $completeFilteredByQuery = combine(
  {
    referendums: governanceModel.$completedReferendums,
    query: referendumFilterModel.$query,
    details: referendumListModel.$referendumsDetails,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ referendums, details, chain, query }) => {
    return governancePageUtils.filteredByQuery({ referendums, query, details, chainId: chain?.chainId });
  },
);

const $ongoingFiltered = combine(
  {
    referendums: governanceModel.$ongoingReferendums,
    selectedVoteId: referendumFilterModel.$selectedVoteId,
    selectedTrackIds: referendumFilterModel.$selectedTrackIds,
    voting: governanceModel.$voting,
  },
  ({ referendums, selectedVoteId, voting, selectedTrackIds }) => {
    const filteredReferendums = Array.from(referendums.entries()).filter(([key, referendum]) => {
      const filteredByVote = governancePageUtils.filterByVote({ selectedVoteId, key, voting });
      const filteredByTracks = governancePageUtils.filterByTracks(selectedTrackIds, referendum);

      return filteredByVote && filteredByTracks;
    });

    return new Map(filteredReferendums);
  },
);

const $completeFiltered = combine(
  {
    referendums: governanceModel.$completedReferendums,
    selectedVoteId: referendumFilterModel.$selectedVoteId,
    selectedTrackIds: referendumFilterModel.$selectedTrackIds,
    voting: governanceModel.$voting,
  },
  ({ referendums, selectedVoteId, voting, selectedTrackIds }) => {
    if (selectedTrackIds?.length > 0) return new Map();

    const filteredReferendums = Array.from(referendums.entries()).filter(([key]) => {
      return governancePageUtils.filterByVote({ selectedVoteId, key, voting });
    });

    return new Map(filteredReferendums);
  },
);

sample({
  clock: flowStarted,
  target: networkSelectorModel.input.defaultChainSet,
});

sample({
  source: networkSelectorModel.$governanceChain,
  filter: (chain): chain is Chain => Boolean(chain),
  target: referendumListModel.input.chainChanged,
});

// sample({
//   clock: referendumSelected,
//   source: $chainId,
//   fn: (chainId, index) => ({ chainId, index }),
//   target: referendumDetailsModel.input.flowStarted,
// });

// sample({
//   clock: referendumListModel.output.referendumSelected,
//   target: referendumDetailsModel.events.referendumChanged,
// });

sample({
  clock: [referendumFilterModel.events.queryChanged, $ongoingFiltered, $ongoingFilteredByQuery],
  source: {
    ongoingFiltered: $ongoingFiltered,
    ongoingFilteredByQuery: $ongoingFilteredByQuery,
    query: referendumFilterModel.$query,
  },
  fn: ({ ongoingFiltered, ongoingFilteredByQuery, query }) => {
    return query === '' ? ongoingFiltered : ongoingFilteredByQuery;
  },
  target: $ongoing,
});

sample({
  clock: [referendumFilterModel.events.queryChanged, $completeFiltered, $completeFilteredByQuery],
  source: {
    completeFiltered: $completeFiltered,
    completeFilteredByQuery: $completeFilteredByQuery,
    query: referendumFilterModel.$query,
  },
  fn: ({ completeFiltered, completeFilteredByQuery, query }) => {
    return query === '' ? completeFiltered : completeFilteredByQuery;
  },
  target: $completed,
});

export const governancePageModel = {
  $ongoing,
  $completed,

  events: {
    flowStarted,
    referendumSelected,
  },
};
