import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type Chain, type ChainId } from '@/shared/core';
import { createDataSource, createDataSubscription } from '@/shared/effector';
import { getCreatedDateFromApi, merge, nullable } from '@/shared/lib/utils';
import { multisigPallet } from '@/shared/pallet/multisig';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { generateEventId, generateOperationId } from '@/entities/multisig';

import { fetchOperations } from './resource';
import { operationsService } from './service';
import { type MultisigEvent, type MultisigOperation } from './types';

type RequestParams = {
  accountId: AccountId;
  api: ApiPromise;
  chain: Chain;
};

const $operations = createStore<Record<ChainId, MultisigOperation[]>>({});

const { request: requestOperations } = createDataSource({
  source: $operations,
  target: $operations,
  pool: (params: RequestParams) => params.api.genesisHash.toHex() || '0x00',
  async fn({ api, accountId }: RequestParams) {
    const operations: MultisigOperation[] = [];

    const response = await multisigPallet.storage.multisigs(api, accountId);
    const chainId = api.genesisHash.toHex();

    for (const { key, multisig } of response) {
      if (nullable(multisig)) continue;
      const timestamp = await getCreatedDateFromApi(multisig.when.height, api);

      const operationId = generateOperationId(key.callHash, key.accountId, multisig.when.height, multisig.when.index);

      const events = multisig.approvals.map(
        accountId =>
          ({
            id: generateEventId(operationId, accountId, 'approve'),
            chainId,
            accountId,
            status: 'approve',
            callHash: key.callHash,
            blockCreated: multisig.when.height,
            indexCreated: multisig.when.index,
            timestamp,
          }) as MultisigEvent,
      );

      operations.push({
        id: operationId,
        chainId,
        status: 'pending',
        accountId: key.accountId,
        callHash: key.callHash,
        depositor: multisig.depositor,
        blockCreated: multisig.when.height,
        indexCreated: multisig.when.index,
        deposit: multisig.deposit,
        timestamp,
        events,
        callData: null,
      });
    }

    return operations;
  },
  map(operations, { params: { api }, result }) {
    const chainId = api.genesisHash.toHex();

    const oldOperations = operations[chainId] ?? [];
    const newOperations = operationsService.mergeMultisigOperations(oldOperations, result);

    return {
      ...operations,
      [chainId]: newOperations,
    };
  },
});

const { subscribe, unsubscribe } = createDataSubscription<
  Record<ChainId, MultisigOperation[]>,
  RequestParams[],
  { operations: MultisigOperation[]; chainId: ChainId }
>({
  initial: {},
  fn(params: RequestParams[], callback) {
    const unsubscribeFns = [];

    for (const { chain, accountId, api } of params) {
      const url = chain.externalApi?.proxy.find(x => x.type === 'subquery')?.url;
      if (nullable(url)) {
        throw new Error(`Proxy/multisig indexer doesn't support ${chain.name} chain`);
      }

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
  $operations,

  requestOperations,
  subscribe,
  unsubscribe,
};
