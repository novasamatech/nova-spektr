import { type ApiPromise } from '@polkadot/api';
import { createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';

import { type ChainId } from '@/shared/core';
import { deriveFromResources } from '@/shared/resource';
import { mergeNested } from '../_lib/helpers';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { maxRankResource, tracksResource } from './resource';
import { type Track } from './types';

const $list = createStore<CollectivesStruct<Track[]>>({});
const $maxRank = createStore<CollectivesStruct<number>>({});

const request = createEvent<{
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
}>();

deriveFromResources({
  store: $list,
  resources: [tracksResource],
  map(state, tracks) {
    return mergeNested(state, tracks, t => t.id);
  },
});

deriveFromResources({
  store: $maxRank,
  resources: [maxRankResource],
  map(state, { palletType, chainId, maxRank }) {
    return produce(state, draft => {
      let pallet = draft[palletType];
      if (!pallet) {
        pallet = {};
        draft[palletType] = pallet;
      }
      pallet[chainId] = maxRank;
    });
  },
});

sample({
  clock: request,
  target: [tracksResource.request, maxRankResource.request],
});

export const track = {
  $list,
  $maxRank,
  pending: tracksResource.request.pending,
  request,
};
