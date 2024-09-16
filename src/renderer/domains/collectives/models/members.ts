import { type ApiPromise } from '@polkadot/api';

import { merge, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { type CollectiveMemberRecord, collectivePallet } from '@/shared/pallet/collective';
import { type AccountId, type ChainId } from '@shared/core';
import { createDataSource } from '@shared/effector';
import { type CollectivePalletsType, type Store } from '../lib/types';

export type Member = {
  accountId: AccountId;
  member: CollectiveMemberRecord | null;
};

export type RequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
};

const {
  $: $membersStore,
  request: requestMembers,
  pending,
} = createDataSource<Store<Member[]>, RequestParams, Member[]>({
  initial: {},
  fn: ({ api, palletType }) => collectivePallet.storage.members(palletType, api),
  map: (store, { params, result }) => {
    const currentStore = pickNestedValue(store, params.palletType, params.chainId) ?? [];
    const updatedField = merge(currentStore, result, x => x.accountId);

    return setNestedValue(store, params.palletType, params.chainId, updatedField);
  },
});

export const membersDomainModel = {
  $membersStore,

  pending,
  requestMembers,
};
