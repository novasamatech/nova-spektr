import { type ApiPromise } from '@polkadot/api';

import { type Chain, type ChainId } from '@/shared/core';
import { createDataSubscription } from '@/shared/effector';
import { merge, nullable } from '@/shared/lib/utils';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { fetchOperations } from './resource';
import { type MultisigOperation } from './types';

type SubscriptionParams = {
  api: ApiPromise;
  chain: Chain;
  accountId: AccountId;
};

const {
  $: $list,
  subscribe,
  unsubscribe,
} = createDataSubscription<
  Record<ChainId, MultisigOperation[]>,
  SubscriptionParams[],
  { chainId: ChainId; operations: MultisigOperation[] }
>({
  key: params => params[0]!.chain.chainId,
  initial: {},
  fn(params: SubscriptionParams[], callback) {
    const unsubscribeFns = [];

    for (const { chain, accountId, api } of params) {
      const url = chain.externalApi?.proxy.find(x => x.type === 'subquery')?.url;
      if (nullable(url)) {
        throw new Error(`Proxy/multisig indexer doesn't support ${chain.name} chain`);
      }

      console.log('xcm', url);

      const fn = () => {
        fetchOperations(url, accountId, chain.chainId).then(value => {
          callback({ done: true, value: { chainId: chain.chainId, operations: value } });
        });
      };

      fn();

      const unsubscribe = polkadotjsHelpers.subscribeSystemEvents({ api, section: 'multisig' }, fn);
      unsubscribeFns.push(unsubscribe);
    }

    return Promise.all(unsubscribeFns).then(fns => () => {
      for (const fn of fns) {
        fn();
      }
    });
  },
  map(store, { result }) {
    const prev = store[result.chainId] ?? [];
    const newList = merge({
      a: prev,
      b: result.operations,
      mergeBy: a => [a.accountId, a.blockCreated, a.indexCreated, a.callHash],
      sort: (a, b) => b.blockCreated - a.blockCreated,
    });

    return {
      ...store,
      [result.chainId]: newList,
    };
  },
});

export const operations = {
  $list,

  subscribe,
  unsubscribe,
};
