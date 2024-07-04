import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Address, Chain, type ChainId, type Identity, type Referendum } from '@shared/core';
import { referendumUtils } from '@entities/governance';
import { proposersService } from '../lib/proposers-service';

const $proposers = createStore<Record<ChainId, Record<Address, Identity>>>({});

const requestProposer = createEvent<{ referendum: Referendum; chain: Chain; api: ApiPromise }>();

type GetProposersParams = {
  api: ApiPromise;
  chain: Chain;
  addresses: Address[];
};

const requestProposersFx = createEffect(({ api, addresses }: GetProposersParams) => {
  return proposersService.getIdentities(api, addresses);
});

sample({
  clock: requestProposer,
  filter: ({ referendum }) => referendumUtils.isOngoing(referendum),
  fn: ({ api, chain, referendum }) => {
    return {
      api: api,
      chain,
      addresses:
        referendumUtils.isOngoing(referendum) && referendum.submissionDeposit ? [referendum.submissionDeposit.who] : [],
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
    requestProposer,
  },
};
