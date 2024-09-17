import { type ApiPromise } from '@polkadot/api';

import { merge, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { type CollectiveMemberRecord, collectivePallet } from '@/shared/pallet/collective';
import { type AccountId, type ChainId } from '@shared/core';
import { createDataSubscription, createPagesHandler } from '@shared/effector';
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
  $: $members,
  pending,
  subscribe,
  unsubscribe,
  received,
} = createDataSubscription<Store<Member[]>, RequestParams, Member[]>({
  initial: {},
  fn: ({ api, palletType }, callback) => {
    const currentAbortController = new AbortController();
    const fetchPages = createPagesHandler(() => collectivePallet.storage.membersPaged(palletType, api, 50));

    fetchPages(currentAbortController, callback);

    // TODO add system event for members change
    return () => {
      currentAbortController.abort();
    };
  },
  map: (store, { params, result }) => {
    const currentStore = pickNestedValue(store, params.palletType, params.chainId) ?? [];
    const updatedField = merge(currentStore, result, x => x.accountId);

    return setNestedValue(store, params.palletType, params.chainId, updatedField);
  },
});

export const membersDomainModel = {
  $members,

  pending,
  subscribe,
  unsubscribe,
  received,
};
