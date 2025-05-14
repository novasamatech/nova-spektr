import { combine, createEffect, createEvent, createStore, sample } from 'effector';

import { type GovernanceApi } from '@/shared/api/governance';
import { type Chain, type ChainId, type Referendum, type ReferendumId } from '@/shared/core';
import { pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { identity } from '@/domains/network';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';

import { networkSelectorModel } from './networkSelector';

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
    api: governanceMetaProvider.$metaProvider,
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

//Identities for governance chain
const $identities = combine(identity.$list, networkSelectorModel.$governanceChainId, (list, chainId) =>
  chainId ? (list[chainId] ?? {}) : {},
);

const requestIdentity = sample({
  clock: requestDescription,
  source: networkSelectorModel.$governanceChainId,
  fn: (chainId, { referendum }) => {
    return {
      chainId,
      referendum,
    };
  },
}).filterMap(({ chainId, referendum }) => {
  if (chainId && referendum.type === 'Ongoing' && referendum.proposal?.type === 'Spend') {
    return { chainId, accounts: [referendum.proposal.beneficiary] };
  }
});

sample({
  clock: requestIdentity,
  target: identity.request,
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
  $identities,
  events: {
    requestDescription,
  },
};
