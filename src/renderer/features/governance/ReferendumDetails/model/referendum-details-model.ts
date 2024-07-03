import { createStore, createEffect, sample } from 'effector';
import { createGate } from 'effector-react';
import { ApiPromise } from '@polkadot/api';

import type { Address, Chain, ChainId, Identity, Referendum, ReferendumId } from '@shared/core';
import { IGovernanceApi } from '@shared/api/governance';
import { governanceModel, referendumUtils } from '@entities/governance';
import { pickNestedValue, setNestedValue } from '@shared/lib/utils';
import { referendumProposersService } from '@features/governance/ReferendumDetails/lib/referendum-proposers-service';
import { networkSelectorModel } from '@features/governance';

const flow = createGate<{ chain: Chain; referendum: Referendum }>();

// Descriptions

const $descriptions = createStore<Record<ChainId, Record<ReferendumId, string>>>({});

type OffChainParams = {
  service: IGovernanceApi;
  chain: Chain;
  index: ReferendumId;
};

const requestOffChainDetailsFx = createEffect(({ service, chain, index }: OffChainParams) => {
  return service.getReferendumDetails(chain, index);
});

sample({
  clock: flow.open,
  source: {
    api: governanceModel.$governanceApi,
    details: $descriptions,
  },
  filter: ({ api, details }, { referendum, chain }) =>
    !!api && !pickNestedValue(details, chain.chainId, referendum.referendumId),
  fn: ({ api }, { chain, referendum }) => ({
    chain,
    service: api!.service,
    index: referendum.referendumId,
  }),
  target: requestOffChainDetailsFx,
});

sample({
  clock: requestOffChainDetailsFx.done,
  source: $descriptions,
  fn: (details, { params, result }) => setNestedValue(details, params.chain.chainId, params.index, result ?? ''),
  target: $descriptions,
});

// Proposers

type GetProposersParams = {
  api: ApiPromise;
  addresses: Address[];
};

const $proposers = createStore<Record<ChainId, Record<Address, Identity>>>({});

const requestProposersFx = createEffect(({ api, addresses }: GetProposersParams) => {
  return referendumProposersService.getIdentities(api, addresses);
});

sample({
  clock: flow.open,
  source: {
    api: networkSelectorModel.$governanceChainApi,
  },
  filter: ({ api }, { referendum }) => referendumUtils.isOngoing(referendum) && !!api,
  fn: ({ api }, { referendum }) => {
    return {
      api: api!,
      addresses:
        referendumUtils.isOngoing(referendum) && referendum.submissionDeposit ? [referendum.submissionDeposit.who] : [],
    };
  },
  target: requestProposersFx,
});

sample({
  clock: requestProposersFx.done,
  source: {
    proposers: $proposers,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ chain }) => !!chain,
  fn: ({ proposers, chain }, { result }) => {
    return { ...proposers, [chain!.chainId]: { ...proposers[chain!.chainId], ...result } };
  },
  target: $proposers,
});

// Model

export const referendumDetailsModel = {
  $descriptions,
  $proposers,
  $isProposersLoading: requestProposersFx.pending,
  $isDetailsLoading: requestOffChainDetailsFx.pending,

  input: { flow },
};
