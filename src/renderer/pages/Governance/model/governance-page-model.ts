import { combine, createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import type { ChainId, CompletedReferendum, OngoingReferendum, ReferendumId } from '@shared/core';
import { networkSelectorModel, referendumFilterModel, referendumListModel } from '@features/governance';
import { governanceModel } from '@entities/governance';
import { filterReferendums } from '@pages/Governance/lib/utils';
import { governancePageUtils } from '../lib/governance-page-utils';

const governanceFlow = createGate();

const $ongoingFilteredReferendums = createStore<Record<ChainId, Record<ReferendumId, OngoingReferendum>>>({});
const $completeFilteredReferendums = createStore<Record<ChainId, Record<ReferendumId, CompletedReferendum>>>({});

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
  clock: governanceFlow.open,
  target: networkSelectorModel.input.defaultChainSet,
});

sample({
  clock: [referendumFilterModel.events.queryChanged, $ongoingFiltered, $ongoingFilteredByQuery],
  source: {
    filteredReferendums: $ongoingFilteredReferendums,
    referendums: governanceModel.$ongoingReferendums,
    details: referendumListModel.$referendumsNames,
    chain: networkSelectorModel.$governanceChain,
    query: referendumFilterModel.$query,
  },
  filter: ({ chain }) => Boolean(chain),
  fn: ({ filteredReferendums, referendums, details, chain, query }) => {
    return {
      ...filteredReferendums,
      [chain!.chainId]: filterReferendums({
        referendums: referendums[chain!.chainId],
        titles: details,
        query,
        chainId: chain!.chainId,
      }),
    };
  },
  target: $ongoing,
});

sample({
  clock: [referendumFilterModel.events.queryChanged, $completeFiltered, $completeFilteredByQuery],
  source: {
    filteredReferendums: $completeFilteredReferendums,
    referendums: governanceModel.$completedReferendums,
    details: referendumListModel.$referendumsNames,
    chain: networkSelectorModel.$governanceChain,
    query: referendumFilterModel.$query,
  },
  filter: ({ chain }) => Boolean(chain),
  fn: ({ filteredReferendums, referendums, details, chain, query }) => {
    return {
      ...filteredReferendums,
      [chain!.chainId]: filterReferendums({
        referendums: referendums[chain!.chainId],
        titles: details,
        query,
        chainId: chain!.chainId,
      }),
    };
  },
  target: $completeFilteredReferendums,
});

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
  $ongoing: $ongoingFilteredReferendums,
  $completed: $completeFilteredReferendums,

  gates: {
    governanceFlow,
  },
};
