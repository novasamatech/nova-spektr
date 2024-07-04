import { combine, createStore, sample } from 'effector';
import isEmpty from 'lodash/isEmpty';

import { type Chain, type ChainId, type ReferendumId } from '@shared/core';
import { type IGovernanceApi } from '@shared/api/governance';
import { governanceModel } from '@entities/governance';
import { createChunksEffect } from '../utils/createChunksEffect';
import { networkSelectorModel } from './network-selector-model';

const $titles = createStore<Record<ChainId, Record<ReferendumId, string>>>({});

const $referendumTitles = combine(
  {
    titles: $titles,
    chain: networkSelectorModel.$governanceChain,
  },
  ({ titles, chain }) => (chain ? titles[chain.chainId] ?? {} : {}),
);

type OffChainParams = {
  chain: Chain;
  service: IGovernanceApi;
};

type OffChainReceiveParams = {
  chainId: ChainId;
  data: Record<string, string>;
};

const {
  request: requestOffChainReferendums,
  receive: receiveOffChainReferendums,
  pending: $isTitlesLoading,
} = createChunksEffect<OffChainParams, OffChainReceiveParams>(({ chain, service }, cb) => {
  return service.getReferendumList(chain, (data) => {
    cb({ chainId: chain.chainId, data });
  });
});

sample({
  clock: networkSelectorModel.$governanceChainApi,
  source: {
    chain: networkSelectorModel.$governanceChain,
    governanceApi: governanceModel.$governanceApi,
  },
  filter: ({ chain, governanceApi }, referendums) => {
    return !!chain && !!governanceApi && !isEmpty(referendums);
  },
  fn: ({ chain, governanceApi }) => ({
    chain: chain!,
    service: governanceApi!.service,
  }),
  target: requestOffChainReferendums,
});

sample({
  clock: receiveOffChainReferendums,
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
