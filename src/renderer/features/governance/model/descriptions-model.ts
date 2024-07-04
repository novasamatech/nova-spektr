import { createStore, createEffect, sample, createEvent } from 'effector';

import type { Chain, ChainId, Referendum, ReferendumId } from '@shared/core';
import { IGovernanceApi } from '@shared/api/governance';
import { governanceModel } from '@entities/governance';
import { pickNestedValue, setNestedValue } from '@shared/lib/utils';

const $descriptions = createStore<Record<ChainId, Record<ReferendumId, string>>>({});

const requestDescription = createEvent<{ referendum: Referendum; chain: Chain }>();

type OffChainParams = {
  service: IGovernanceApi;
  chain: Chain;
  index: ReferendumId;
};

const requestOffChainDetailsFx = createEffect(({ service, chain, index }: OffChainParams) => {
  return service.getReferendumDetails(chain, index);
});

sample({
  clock: requestDescription,
  source: {
    api: governanceModel.$governanceApi,
    descriptions: $descriptions,
  },
  filter: ({ api, descriptions }, { referendum, chain }) =>
    !!api && !pickNestedValue(descriptions, chain.chainId, referendum.referendumId),
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

export const descriptionsModel = {
  $descriptions,
  $isDescriptionLoading: requestOffChainDetailsFx.pending,

  events: {
    requestDescription,
  },
};
