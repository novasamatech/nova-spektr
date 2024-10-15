import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type ChainId } from '@/shared/core';
import { createDataSource, createDataSubscription, createPagesHandler } from '@/shared/effector';
import { merge, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { type ReferendumId, referendaPallet } from '@/shared/pallet/referenda';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type CollectivePalletsType, type CollectivesStruct } from '../../lib/types';

import { mapReferendum } from './mapper';
import { type Referendum } from './types';

type ReferendumSubscriptionParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chainId: ChainId;
};

const $list = createStore<CollectivesStruct<Referendum[]>>({});

const { pending, subscribe, unsubscribe, received, fulfilled } = createDataSubscription<
  CollectivesStruct<Referendum[]>,
  ReferendumSubscriptionParams,
  Referendum[]
>({
  initial: $list,
  fn: ({ api, palletType }, callback) => {
    let currectAbortController = new AbortController();

    const fetchPages = createPagesHandler({
      fn: () => referendaPallet.storage.referendumInfoForPaged(palletType, api, 200),
      map: page => {
        const value: Referendum[] = [];
        for (const { id, info } of page) {
          if (!info) continue;
          value.push(mapReferendum(id, info));
        }

        return value;
      },
    });

    fetchPages(currectAbortController, callback);

    const fn = () => {
      currectAbortController.abort();
      currectAbortController = new AbortController();
      fetchPages(currectAbortController, callback);
    };

    /**
     * All events related to referendums / voting are collected here
     *
     * @see https://github.com/paritytech/polkadot-sdk/blob/43cd6fd4370d3043272f64a79aeb9e6dc0edd13f/substrate/frame/collective/src/lib.rs#L459
     */
    return polkadotjsHelpers.subscribeSystemEvents({ api, section: `${palletType}Referenda` }, fn).then(fn => () => {
      currectAbortController.abort();
      fn();
    });
  },
  map: (store, { params, result }) => {
    const currentStore = pickNestedValue(store, params.palletType, params.chainId) ?? [];
    const updatedField = merge(
      currentStore,
      result,
      x => x.id,
      (a, b) => b.id - a.id,
    );

    return setNestedValue(store, params.palletType, params.chainId, updatedField);
  },
});

type ReferendumRequestParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chainId: ChainId;
  referendums: ReferendumId[];
};

const { request } = createDataSource<CollectivesStruct<Referendum[]>, ReferendumRequestParams, Referendum[]>({
  initial: $list,
  async fn({ api, palletType, referendums }) {
    const response = await referendaPallet.storage.referendumInfoFor(palletType, api, referendums);
    const value: Referendum[] = [];
    for (const { id, info } of response) {
      if (!info) continue;
      value.push(mapReferendum(id, info));
    }

    return value;
  },
  map(store, { params, result }) {
    const currentStore = pickNestedValue(store, params.palletType, params.chainId) ?? [];
    const updatedField = merge(
      currentStore,
      result,
      x => x.id,
      (a, b) => b.id - a.id,
    );

    return setNestedValue(store, params.palletType, params.chainId, updatedField);
  },
});

export const referendumDomainModel = {
  $list,
  pending,
  request,
  subscribe,
  unsubscribe,
  received,
  fulfilled,
};
