import { createStore, sample } from 'effector';
import { createGate } from 'effector-react';

import type { ChainId, CompletedReferendum, OngoingReferendum, ReferendumId } from '@shared/core';
import { networkSelectorModel, referendumFilterModel, referendumListModel } from '@features/governance';
import { governanceModel } from '@entities/governance';
import { filterReferendums } from '@pages/Governance/lib/utils';

const governanceFlow = createGate();

const $ongoingFilteredReferendums = createStore<Record<ChainId, Record<ReferendumId, OngoingReferendum>>>({});
const $completeFilteredReferendums = createStore<Record<ChainId, Record<ReferendumId, CompletedReferendum>>>({});

sample({
  clock: governanceFlow.open,
  target: networkSelectorModel.input.defaultChainSet,
});

sample({
  clock: [referendumFilterModel.events.queryChanged, governanceModel.$ongoingReferendums],
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
  target: $ongoingFilteredReferendums,
});

sample({
  clock: [referendumFilterModel.events.queryChanged, governanceModel.$completedReferendums],
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

export const governancePageModel = {
  $ongoing: $ongoingFilteredReferendums,
  $completed: $completeFilteredReferendums,

  gates: {
    governanceFlow,
  },
};
