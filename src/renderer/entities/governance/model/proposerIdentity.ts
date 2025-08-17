import { type ApiPromise } from '@polkadot/api';
import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { type Chain, type ChainId, type Identity, type Referendum } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';
import { proposersService } from '../lib/proposersService';
import { referendumService } from '../lib/referendumService';

const $proposers = createStore<Record<ChainId, Record<AccountId, Identity>>>({});

type GetProposersParams = {
  api: ApiPromise;
  chain: Chain;
  accounts: AccountId[];
};

const requestReferendumProposer = createEvent<{ referendum: Referendum; chain: Chain; api: ApiPromise }>();
const requestProposers = createEvent<GetProposersParams>();

const requestProposersFx = createEffect(({ api, accounts }: GetProposersParams) => {
  return proposersService.getIdentities(api, accounts);
});

sample({
  clock: requestReferendumProposer,
  source: { apis: networkModel.$apis },
  filter: (_, { referendum }) => referendumService.isOngoing(referendum),
  fn: ({ apis }, { api, chain, referendum }) => {
    const identityChainId = chain?.additional?.identityChain;

    return {
      api: identityChainId ? apis[identityChainId] : api!,
      chain,
      accounts:
        referendumService.isOngoing(referendum) && referendum.submissionDeposit
          ? [referendum.submissionDeposit.who]
          : [],
    };
  },
  target: requestProposersFx,
});

// TODO: use identity domain request
sample({
  clock: requestProposers,
  source: {
    apis: networkModel.$apis,
    proposers: $proposers,
  },
  fn: ({ apis, proposers }, { api, chain, accounts }) => {
    const identityChainId = chain?.additional?.identityChain;
    const chainProposers = proposers[chain.chainId] ?? {};
    const filteredAccounts = accounts.filter((a) => !(a in chainProposers));

    return {
      api: identityChainId ? (apis[identityChainId] ?? api!) : api!,
      chain,
      accounts: filteredAccounts,
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
