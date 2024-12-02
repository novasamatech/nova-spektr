import { combine, createEvent, sample } from 'effector';

import { type Address, type Referendum } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { proposerIdentityModel } from '@/entities/governance';
import { networkSelectorModel } from '../model/networkSelector';

const $proposers = combine(
  {
    proposers: proposerIdentityModel.$proposers,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ proposers, chainId }) => {
    return chainId ? (proposers[chainId] ?? {}) : {};
  },
);

const requestReferendumProposer = createEvent<{ referendum: Referendum }>();
const requestProposers = createEvent<{ addresses: Address[] }>();

sample({
  clock: requestReferendumProposer,
  source: networkSelectorModel.$network,
  filter: nonNullable,
  fn: (network, { referendum }) => ({
    api: network!.api,
    chain: network!.chain,
    referendum,
  }),
  target: proposerIdentityModel.events.requestReferendumProposer,
});

sample({
  clock: requestProposers,
  source: networkSelectorModel.$network,
  filter: nonNullable,
  fn: (network, { addresses }) => ({
    api: network!.api,
    chain: network!.chain,
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
