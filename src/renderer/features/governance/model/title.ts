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

type OffChainReceiveParams = {
  chainId: ChainId;
  data: Record<string, string>;
};

const {
  request: requestReferendumTitles,
  receive: receiveReferendumTitles,
  pending: $isTitlesLoading,
  done: referendumTitlesReceived,
} = createChunksEffect<OffChainParams, OffChainReceiveParams>(({ chain, service }, cb) => {
  return service.getReferendumList(chain, (data) => {
    cb({ chainId: chain.chainId, data });
  });
});

sample({
  clock: referendumTitlesReceived,
  source: $loadedTitles,
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
  fn: (referendumsDetails, { chainId, data }) => {
    const { [chainId]: chainToUpdate, ...rest } = referendumsDetails;

    return { ...rest, [chainId]: { ...chainToUpdate, ...data } };
  },
  target: $titles,
});

export const titleModel = {
  $titles,
  $referendumTitles,
  $isTitlesLoading,
};
