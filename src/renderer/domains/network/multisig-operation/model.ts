import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';

import { type Chain, type ChainId } from '@/shared/core';
import { createDataSource, createDataSubscription } from '@/shared/effector';
import { getCreatedDateFromApi, merge, nullable } from '@/shared/lib/utils';
import { multisigPallet } from '@/shared/pallet/multisig';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { fetchOperations } from './resource';
import { multisigEvent } from './schema';
import { multisigOperationService } from './service';
import { type MultisigEvent, type MultisigOperation, type MultisigOperationData } from './types';

type RequestParams = {
  accountId: AccountId;
  api: ApiPromise;
  chain: Chain;
};

const $list = createStore<MultisigOperation[]>([]);

const { request: requestOperations } = createDataSource({
  source: $list,
  target: $list,
  pool: (params: RequestParams) => params.api.genesisHash.toHex() || '0x00',
  async fn({ api, accountId }: RequestParams) {
    const operations: MultisigOperation[] = [];

    const response = await multisigPallet.storage.multisigs(api, accountId);
    const chainId = api.genesisHash.toHex();

    for (const { key, multisig } of response) {
      if (nullable(multisig)) continue;
      const timestamp = await getCreatedDateFromApi(multisig.when.height, api);

      const operationId = multisigOperationService.getOperationId(
        key.callHash,
        key.accountId,
        multisig.when.height,
        multisig.when.index,
      );

      const events = multisig.approvals.map(
        accountId =>
          ({
            id: multisigOperationService.getEventId(operationId, accountId, 'approve'),
            chainId,
            accountId,
            status: 'approve',
            callHash: key.callHash,
            blockCreated: multisig.when.height,
            indexCreated: multisig.when.index,
            timestamp,
          }) as MultisigEvent,
      );

      const transaction = await multisigOperationService.getTransactionFromChain({
        api,
        callHash: key.callHash,
        blockHeight: multisig.when.height,
        extrinsicIndex: multisig.when.index,
      });

      const callData = transaction?.method.toHex() || null;
      const operationData = (transaction?.method.toHuman() || {}) as MultisigOperationData;

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
        callData,
        ...operationData,
      });
    }

    return operations;
  },
  map(operations, { result }) {
    return multisigOperationService.mergeMultisigOperations(operations, result);
  },
});

const { subscribe: subscribeEvents, unsubscribe: unsubscribeEvents } = createDataSubscription<
  MultisigOperation[],
  RequestParams[],
  { event: MultisigEvent; operationId: string; chainId: ChainId }
>({
  initial: $list,
  fn: (params, callback) => {
    const unsubscribeFns: Promise<VoidFunction>[] = [];

    for (const { accountId, api } of params) {
      const unsubscribeFn = polkadotjsHelpers.subscribeSystemEvents(
        {
          api,
          section: 'multisig',
          // TODO support 'NewMultisig' event
          methods: ['MultisigApproval', 'MultisigExecuted', 'MultisigCancelled'],
        },
        event => {
          const data = multisigEvent.parse(event.data);

          if (data.multisig !== accountId) return;

          const operationId = multisigOperationService.getOperationId(
            data.callHash,
            data.account,
            data.timepoint.height,
            data.timepoint.index,
          );

          callback({
            done: true,
            value: {
              chainId: api.genesisHash.toHex(),
              operationId,
              event: {
                id: multisigOperationService.getEventId(operationId, accountId, 'approve'),
                accountId: data.account,
                status: event.method === 'MultisigCancelled' ? 'reject' : 'approve',
                indexCreated: data.timepoint.index,
                blockCreated: data.timepoint.height,
                timestamp: Date.now(),
              },
            },
          });
        },
      );

      unsubscribeFns.push(unsubscribeFn);
    }

    return () => {
      Promise.all(unsubscribeFns).then(fns => {
        for (const fn of fns) {
          fn();
        }
      });
    };
  },
  map: (list, { result: { chainId, operationId, event } }) => {
    const operation = list.find(x => x.id === operationId && x.chainId === chainId);
    if (!operation) return list;

    const newOperation = {
      ...operation,
      status: event.status === 'reject' ? 'cancelled' : operation.status,
      events: multisigOperationService.mergeEvents(operation?.events, [event]),
    };

    return multisigOperationService.mergeMultisigOperations(list, [newOperation]);
  },
});

const { subscribe: subscribeIndexer, unsubscribe: unsubscribeIndexer } = createDataSubscription<
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

export const multisigOperations = {
  $list,

  requestOperations,
  subscribeIndexer,
  unsubscribeIndexer,
  subscribeEvents,
  unsubscribeEvents,
};
