import { createEvent, createStore, sample } from 'effector';

import type { ReferendumId, Chain, OngoingReferendum, CompletedReferendum } from '@shared/core';
import { governanceModel } from '@entities/governance';
import { networkSelectorModel, referendumFilterModel, referendumListModel } from '@features/governance';
import { filterReferendums } from '../lib/utils';

const flowStarted = createEvent();
const referendumSelected = createEvent<ReferendumId>();

const $ongoingFilteredReferendums = createStore<Map<ReferendumId, OngoingReferendum>>(new Map());
const $completeFilterddReferendums = createStore<Map<ReferendumId, CompletedReferendum>>(new Map());

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
  clock: [referendumFilterModel.events.queryChanged, governanceModel.$ongoingReferendums],
  source: {
    referendums: governanceModel.$ongoingReferendums,
    details: referendumListModel.$referendumsDetails,
    chain: networkSelectorModel.$governanceChain,
    query: referendumFilterModel.$query,
  },
  filter: ({ chain }) => Boolean(chain),
  fn: ({ referendums, details, chain, query }) =>
    filterReferendums({ referendums, details, query, chainId: chain!.chainId }),
  target: $ongoingFilteredReferendums,
});

sample({
  clock: [referendumFilterModel.events.queryChanged, governanceModel.$completedReferendums],
  source: {
    referendums: governanceModel.$completedReferendums,
    details: referendumListModel.$referendumsDetails,
    chain: networkSelectorModel.$governanceChain,
    query: referendumFilterModel.$query,
  },
  filter: ({ chain }) => Boolean(chain),
  fn: ({ referendums, details, chain, query }) =>
    filterReferendums({ referendums, details, query, chainId: chain!.chainId }),
  target: $completeFilterddReferendums,
});

export const governancePageModel = {
  $ongoing: $ongoingFilteredReferendums,
  $completed: $completeFilterddReferendums,

  events: {
    flowStarted,
    referendumSelected,
  },
};
