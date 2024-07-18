import { combine, createEvent, sample } from 'effector';

import { type Address, type Referendum } from '@shared/core';
import { proposerIdentityModel } from '@entities/governance';
import { networkSelectorModel } from '../model/networkSelector';

const $proposers = combine(
  {
    proposers: proposerIdentityModel.$proposers,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ proposers, chain }) => {
    return chain ? (proposers[chain.chainId] ?? {}) : {};
  },
);

const requestReferendumProposer = createEvent<{ referendum: Referendum }>();
const requestProposers = createEvent<{ addresses: Address[] }>();

sample({
  clock: requestReferendumProposer,
  source: {
    api: networkSelectorModel.$governanceChainApi,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ chain, api }) => !!chain && !!api,
  fn: ({ chain, api }, { referendum }) => ({
    api: api!,
    chain: chain!,
    referendum,
  }),
  target: proposerIdentityModel.events.requestReferendumProposer,
});

sample({
  clock: requestProposers,
  source: {
    api: networkSelectorModel.$governanceChainApi,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ chain, api }) => !!chain && !!api,
  fn: ({ chain, api }, { addresses }) => ({
    api: api!,
    chain: chain!,
    addresses,
  }),
  target: proposerIdentityModel.events.requestProposers,
});

export const proposerIdentityAggregate = {
  $proposers,
  $isProposersLoading: proposerIdentityModel.$isProposersLoading,

  events: {
    proposersRequestDone: proposerIdentityModel.events.proposersRequestDone,
    requestReferendumProposer,
    requestProposers,
  },
};
