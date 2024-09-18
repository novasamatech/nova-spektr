import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { createDataSubscription, createPagesHandler } from '@/shared/effector';
import { merge, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { collectivePallet } from '@/shared/pallet/collective';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type CollectivePalletsType, type CollectivesStruct } from '../../lib/types';

import { type Member } from './types';

export type RequestParams = {
  palletType: CollectivePalletsType;
  api: ApiPromise;
  chainId: ChainId;
};

const {
  $: $list,
  pending,
  subscribe,
  unsubscribe,
  received,
} = createDataSubscription<CollectivesStruct<Member[]>, RequestParams, Member[]>({
  initial: {},
  fn: ({ api, palletType }, callback) => {
    let currentAbortController = new AbortController();

    const fetchPages = createPagesHandler({
      fn: () => collectivePallet.storage.membersPaged(palletType, api, 50),
      map: response => response.map<Member>(x => ({ accountId: x.accountId, rank: x.member?.rank ?? 0 })),
    });
    const fn = () => {
      currentAbortController.abort();
      currentAbortController = new AbortController();
      fetchPages(currentAbortController, callback);
    };

    fetchPages(currentAbortController, callback);

    // TODO check if section name is correct
    return polkadotjsHelpers.subscribeSystemEvents({ api, section: 'fellowshipCore' }, fn).then(fn => () => {
      currentAbortController.abort();
      fn();
    });
  },
  map: (store, { params, result }) => {
    const currentStore = pickNestedValue(store, params.palletType, params.chainId) ?? [];
    const updatedField = merge(
      currentStore,
      result,
      x => x.accountId,
      (a, b) => a.rank - b.rank,
    );

    return setNestedValue(store, params.palletType, params.chainId, updatedField);
  },
});

export const membersDomainModel = {
  $list,

  pending,
  subscribe,
  unsubscribe,
  received,
};
