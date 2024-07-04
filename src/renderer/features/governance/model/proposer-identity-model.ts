import { createEvent, sample } from 'effector';

import { type Referendum } from '@shared/core';
import { proposerIdentityModel as proposerIdentityModelEntity } from '@entities/governance';
import { networkSelectorModel } from './network-selector-model';

const requestProposer = createEvent<{ referendum: Referendum }>();

sample({
  clock: requestProposer,
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
  target: proposerIdentityModelEntity.events.requestProposer,
});

export const proposerIdentityModel = {
  $proposers: proposerIdentityModelEntity.$proposers,
  $isProposersLoading: proposerIdentityModelEntity.$isProposersLoading,
  events: {
    requestProposer,
  },
};
