import { createEffect, createStore, sample } from 'effector';

import { merge } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { updateStore } from '../lib/helpers';
import { type RequestCollectiveParams, type Store } from '../lib/types';

export type MembersType = Awaited<ReturnType<typeof requestMembersFx>>;

const $membersStore = createStore<Partial<Store<{ members: MembersType | null }>>>({});

const requestMembersFx = createEffect(({ api, palletType }: RequestCollectiveParams) => {
  return collectivePallet.storage.members(palletType, api);
});

sample({
  clock: requestMembersFx.done,
  source: $membersStore,
  fn: (store, { params, result }) => {
    const currentStore = store[params.palletType]?.[params.chainId]?.members || [];
    const updatedField = { members: merge(currentStore, result, x => x?.accountId) };

    return updateStore(store, params, updatedField);
  },
  target: $membersStore,
});

export const membersDomainModal = {
  $isLoading: requestMembersFx.pending,
  $membersStore,

  effects: {
    requestMembersFx,
  },
};
