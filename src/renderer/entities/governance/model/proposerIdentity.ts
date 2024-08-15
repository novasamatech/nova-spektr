import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { AdditionalType } from '@/shared/core/types/chain';
import { type Address, type Chain, type ChainId, type Identity, type Referendum } from '@shared/core';
import { networkModel } from '@/entities/network';
import { proposersService } from '../lib/proposersService';
import { referendumService } from '../lib/referendumService';

const $proposers = createStore<Record<ChainId, Record<Address, Identity>>>({});

type GetProposersParams = {
  api: ApiPromise;
  chain: Chain;
  addresses: Address[];
};

const requestReferendumProposer = createEvent<{ referendum: Referendum; chain: Chain; api: ApiPromise }>();
const requestProposers = createEvent<GetProposersParams>();

const requestProposersFx = createEffect(({ api, addresses }: GetProposersParams) => {
  return proposersService.getIdentities(api, addresses);
});

sample({
  clock: requestReferendumProposer,
  source: { apis: networkModel.$apis },
  filter: (_, { referendum }) => referendumService.isOngoing(referendum),
  fn: ({ apis }, { api, chain, referendum }) => {
    const identityChainId = chain?.additional?.[AdditionalType.IDENTITY_CHAIN];

    return {
      api: identityChainId ? apis[identityChainId] : api!,
      chain,
      addresses:
        referendumService.isOngoing(referendum) && referendum.submissionDeposit
          ? [referendum.submissionDeposit.who]
          : [],
    };
  },
  target: requestProposersFx,
});

sample({
  clock: requestProposers,
  source: {
    apis: networkModel.$apis,
    proposers: $proposers,
  },
  fn: ({ apis, proposers }, { api, chain, addresses }) => {
    const identityChainId = chain?.additional?.[AdditionalType.IDENTITY_CHAIN];
    const chainProposers = proposers[chain.chainId] ?? {};
    const filteredAddresses = addresses.filter((a) => !(a in chainProposers));

    return {
      api: identityChainId ? (apis[identityChainId] ?? api!) : api!,
      chain,
      addresses: filteredAddresses,
    };
  },
  target: requestProposersFx,
});

sample({
  clock: requestProposersFx.done,
  source: $proposers,
  fn: (proposers, { params, result }) => {
    return { ...proposers, [params.chain.chainId]: { ...proposers[params.chain.chainId], ...result } };
  },
  target: $proposers,
});

export const proposerIdentityModel = {
  $proposers: readonly($proposers),
  $isProposersLoading: requestProposersFx.pending,

  events: {
    proposersRequestDone: requestProposersFx.done,
    requestReferendumProposer,
    requestProposers,
  },
};
