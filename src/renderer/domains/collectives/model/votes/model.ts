import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { createDataSource } from '@/shared/effector';
import { nonNullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type CollectivePalletsType, type CollectivesStruct } from '../../lib/types';

import { mapVote } from './mapper';
import { type Vote } from './types';

type RequestVotesParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
  referendumId: ReferendumId;
};

const {
  $: $votes,
  fulfilled,
  pending,
  request,
} = createDataSource<CollectivesStruct<Record<ReferendumId, Vote[]>>, RequestVotesParams, Vote[]>({
  initial: {},
  fn: async ({ api, palletType, referendumId }) => {
    const votes = await collectivePallet.storage.voting(palletType, api, referendumId);

    return votes.map(mapVote).filter(nonNullable);
  },
  map: (store, { params, result }) => {
    const currentValue = pickNestedValue(store, params.palletType, params.chainId);

    return setNestedValue(store, params.palletType, params.chainId, {
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
