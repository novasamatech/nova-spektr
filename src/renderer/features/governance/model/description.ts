import { createEffect, createEvent, createStore, sample } from 'effector';

import { type GovernanceApi } from '@shared/api/governance';
import type { Chain, ChainId, Referendum, ReferendumId } from '@shared/core';
import { pickNestedValue, setNestedValue } from '@shared/lib/utils';

import { governanceModel } from '@entities/governance';

const $descriptions = createStore<Record<ChainId, Record<ReferendumId, string>>>({});

const requestDescription = createEvent<{ referendum: Referendum; chain: Chain }>();

type RequestDescriptionsParams = {
  service: GovernanceApi;
  chain: Chain;
  index: ReferendumId;
};

const requestDescriptionsFx = createEffect(({ service, chain, index }: RequestDescriptionsParams) => {
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
  target: requestDescriptionsFx,
});

sample({
  clock: requestDescriptionsFx.done,
  source: $descriptions,
  fn: (details, { params, result }) => setNestedValue(details, params.chain.chainId, params.index, result ?? ''),
  target: $descriptions,
});

export const descriptionsModel = {
  $descriptions,
  $isDescriptionLoading: requestDescriptionsFx.pending,

  events: {
    requestDescription,
  },
};
