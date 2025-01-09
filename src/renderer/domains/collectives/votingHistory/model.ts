import { type UnitValue, combine, createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { networkModel } from '@/entities/network';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { requestFromChain, requestFromSubQuery } from './source';
import { type Vote } from './types';

type RequestVotesParams = {
  palletType: CollectivePalletsType;
  chainId: ChainId;
  referendumId: ReferendumId;
};

const $votes = createStore<CollectivesStruct<Record<ReferendumId, Vote[]>>>({});
const $source = combine({
  chains: networkModel.$chains,
  apis: networkModel.$apis,
  votes: $votes,
});

const { fulfilled, pending, request } = createDataSource<
  UnitValue<typeof $source>,
  RequestVotesParams,
  Vote[],
  UnitValue<typeof $votes>
>({
  source: $source,
  target: $votes,
  fn: async ({ chainId, palletType, referendumId }, { apis, chains }) => {
    const api = apis[chainId];
    const chain = chains[chainId];

    if (api) {
      try {
        return await requestFromChain(api, palletType, referendumId);
      } catch {
        /* skip */
      }
    }

    if (!chain) return [];

    // TODO get from chain
    // const externalApi = chain.externalApi?.[ExternalType.COLLECTIVES]?.at(0);
    // const sourceUrl = externalApi?.url;
    const sourceUrl = 'https://subquery-collectives-polkadot-stg.novasama-tech.org';

    return requestFromSubQuery(sourceUrl, palletType, referendumId);
  },
  map: ({ votes }, { params, result }) => {
    const currentValue = pickNestedValue(votes, params.palletType, params.chainId);

    return setNestedValue(votes, params.palletType, params.chainId, {
      ...(currentValue ?? {}),
      [params.referendumId]: result,
    });
  },
});

export const votesDomainModel = {
  $votes,

  fulfilled,
  pending,
  request,
};
