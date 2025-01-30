import { type ApiPromise } from '@polkadot/api';
import { type Event } from '@polkadot/types/interfaces/system';
import { createStore } from 'effector';

import { type Chain } from '@/shared/core';
import { createDataSubscription } from '@/shared/effector';
import { merge, nullable, pickNestedValue, setNestedValue } from '@/shared/lib/utils';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type CollectivePalletsType, type CollectivesStruct } from '../_lib/types';

import { fetchAllActivities } from './resource';
import { type FeedRecord } from './types';

const $feed = createStore<CollectivesStruct<FeedRecord[]>>({});

type SubscriptionParams = {
  api: ApiPromise;
  palletType: CollectivePalletsType;
  chain: Chain;
};

const {
  $: $list,
  subscribe,
  unsubscribe,
} = createDataSubscription<CollectivesStruct<FeedRecord[]>, SubscriptionParams, FeedRecord[]>({
  initial: $feed,
  fn({ api, chain, palletType }: SubscriptionParams, callback) {
    const url = chain.externalApi?.collectives.find(x => x.type === 'subquery')?.url;
    if (nullable(url)) {
      throw new Error(`Collectives indexer doesn't support ${chain.name} chain`);
    }

    fetchAllActivities(url, palletType).then(value => {
      callback({ done: true, value });
    });

    const fn = (event: Event) => {
      console.log(event);
    };

    const unsubscribe = Promise.all([
      polkadotjsHelpers.subscribeSystemEvents(
        {
          api,
          section: `${palletType}Salary`,
          methods: ['Paid'],
        },
        fn,
      ),
      polkadotjsHelpers.subscribeSystemEvents(
        {
          api,
          section: `${palletType}Core`,
          methods: ['Imported', 'Proven', 'Requested', 'Promoted', 'Demoted', 'ActiveChanged'],
        },
        fn,
      ),
    ]);

    return unsubscribe.then(fns => () => {
      for (const fn of fns) {
        fn();
      }
    });
  },
  map(store, { params, result }) {
    const prev = pickNestedValue(store, params.palletType, params.chain.chainId) ?? [];
    const newList = merge({
      a: prev,
      b: result,
      mergeBy: a => [a.accountId, a.block, a.type],
      sort: (a, b) => b.block - a.block,
    });

    return setNestedValue(store, params.palletType, params.chain.chainId, newList);
  },
});

export const feed = {
  $list,
  subscribe,
  unsubscribe,
};
