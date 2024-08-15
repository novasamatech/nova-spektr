import { combine, createStore, sample } from 'effector';
import isEmpty from 'lodash/isEmpty';

import { type GovernanceApi } from '@shared/api/governance';
import { type Chain, type ChainId, type ReferendumId } from '@shared/core';
import { governanceModel } from '@entities/governance';
import { createChunksEffect } from '../utils/createChunksEffect';

import { networkSelectorModel } from './networkSelector';

const $titles = createStore<Record<ChainId, Record<ReferendumId, string>>>({});

const $referendumTitles = combine(
  {
    titles: $titles,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ titles, chain }) => (chain ? (titles[chain.chainId] ?? {}) : {}),
);

const $loadedTitles = createStore<Record<ChainId, true>>({});

type OffChainParams = {
  chain: Chain;
  service: GovernanceApi;
};

type OffChainResponse = Record<ReferendumId, string>;

const {
  request: requestReferendumTitles,
  received: receiveReferendumTitles,
  $pending: $isTitlesLoading,
} = createChunksEffect<OffChainParams, OffChainResponse>(({ chain, service }, cb) => {
  return service.getReferendumList(chain, (data) => {
    cb(data);
  });
});

sample({
  clock: receiveReferendumTitles,
  source: $loadedTitles,
  filter: (titles, { params }) => !(params.chain.chainId in titles),
  fn: (titles, { params }) => {
    return { ...titles, [params.chain.chainId]: true };
  },
  target: $loadedTitles,
});

sample({
  clock: networkSelectorModel.$governanceChainApi,
  source: {
    chain: networkSelectorModel.$governanceChain,
    governanceApi: governanceModel.$governanceApi,
    loadedTitles: $loadedTitles,
  },
  filter: ({ chain, governanceApi, loadedTitles }, referendums) => {
    return !!chain && !!governanceApi && !isEmpty(referendums) && !loadedTitles[chain.chainId];
  },
  fn: ({ chain, governanceApi }) => ({
    chain: chain!,
    service: governanceApi!.service,
  }),
  target: requestReferendumTitles,
});

sample({
  clock: receiveReferendumTitles,
  source: $titles,
  fn: (referendumsDetails, { params, result }) => {
    const { [params.chain.chainId]: chainToUpdate, ...rest } = referendumsDetails;

    return { ...rest, [params.chain.chainId]: { ...chainToUpdate, ...result } };
  },
  target: $titles,
});

export const titleModel = {
  $titles,
  $referendumTitles,
  $isTitlesLoading,
};
