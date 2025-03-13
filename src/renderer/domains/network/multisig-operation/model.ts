import { type ApiPromise } from '@polkadot/api';
import { attach, createEffect, createStore, sample, scopeBind } from 'effector';

import { storageService } from '@/shared/api/storage';
import { type Chain, type ChainId, type HexString, type NoID } from '@/shared/core';
import { createDataSource, createDataSubscription } from '@/shared/effector';
import { getCreatedDateFromApi, nullable } from '@/shared/lib/utils';
import { multisigPallet } from '@/shared/pallet/multisig';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';
import { getDataFromCallData } from '@/entities/transaction';

import { transformDepositToBN, transformDepositToString } from './helpers';
import { fetchOperations, multisigEvent } from './resource';
import { multisigOperationService } from './service';
import { type MultisigEvent, type MultisigOperation, type MultisigOperationData } from './types';

const $list = createStore<MultisigOperation[]>([]);

const populateFx = createEffect(() =>
  storageService.multisigOperations.readAll().then(txs => txs.map(transformDepositToBN)),
);

const addTransactionsFx = createEffect(async (transactions: NoID<MultisigOperation>[]) => {
  return storageService.multisigOperations
    .createAll(transactions.map(transformDepositToString))
    .then(result => result?.map(transformDepositToBN) ?? []);
});

const updateTransactionsFx = createEffect((transactions: MultisigOperation[]) => {
  return storageService.multisigOperations
    .updateAll(transactions.map(transformDepositToString))
    .then(() => transactions);
});

const removeTransactionsFx = createEffect((transactions: MultisigOperation[]) => {
  return storageService.multisigOperations.deleteAll(transactions.map(t => t.id)).then(result => result ?? []);
});

type UpdateCallDataParams = {
  tx: MultisigOperation;
  callData: HexString;
};

const updateCallDataFx = attach({
  source: networkModel.$apis,
  effect(apis, { tx, callData }: UpdateCallDataParams) {
    const update = scopeBind(updateTransactionsFx, { safe: true });
    const api = apis[tx.chainId];
    if (!api) {
      throw new Error(`Api from tx not found: ${tx.chainId}`);
    }
    const { decoded } = getDataFromCallData(api, callData);
    const transaction = {
      ...tx,
      ...(decoded.method.toHuman() as MultisigOperationData),
    };

    return update([transaction]);
  },
});

type RequestParams = {
  accountId: AccountId;
  api: ApiPromise;
  chain: Chain;
};

const { request: requestOperations } = createDataSource({
  initial: $list,
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

      const events = multisig.approvals.map<MultisigEvent>(accountId => ({
        id: multisigOperationService.getEventId(operationId, accountId, 'approve'),
        chainId,
        accountId,
        status: 'approve',
        callHash: key.callHash,
        blockCreated: multisig.when.height,
        indexCreated: multisig.when.index,
        timestamp,
      }));

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

          if (data.multisigAccountId !== accountId) return;

          const operationId = multisigOperationService.getOperationId(
            data.callHash,
            data.accountId,
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
                accountId: data.accountId,
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
  MultisigOperation[],
  RequestParams[],
  MultisigOperation[]
>({
  initial: $list,
  fn(params: RequestParams[], callback) {
    const unsubscribeFns = [];

    for (const { chain, accountId } of params) {
      const url = chain.externalApi?.proxy.find(x => x.type === 'subquery')?.url;
      if (nullable(url)) {
        throw new Error(`Proxy/multisig indexer doesn't support ${chain.name} chain`);
      }

      const fn = () => {
        fetchOperations(url, accountId, chain.chainId).then(value => {
          callback({ done: true, value });
        });
      };

      fn();
      const interval = setInterval(fn, 60 * 1000);
      unsubscribeFns.push(() => clearInterval(interval));
    }

    return Promise.all(unsubscribeFns).then(fns => () => {
      for (const fn of fns) {
        fn();
      }
    });
  },
  map(store, { result }) {
    return multisigOperationService.mergeMultisigOperations(store, result);
  },
});

sample({
  clock: populateFx.doneData,
  target: $list,
});

sample({
  clock: addTransactionsFx.doneData,
  source: $list,
  fn: multisigOperationService.mergeMultisigOperations,
  target: $list,
});

sample({
  clock: updateTransactionsFx.doneData,
  source: $list,
  fn: multisigOperationService.mergeMultisigOperations,
  target: $list,
});

sample({
  clock: removeTransactionsFx.doneData,
  source: $list,
  fn(list, removedIds) {
    return list.filter(l => !removedIds.includes(l.id));
  },
  target: $list,
});

export const multisigOperations = {
  $list,

  populate: populateFx,
  addTransactions: addTransactionsFx,
  updateTransactions: updateTransactionsFx,
  removeTransactions: removeTransactionsFx,
  updateCallData: updateCallDataFx,
  requestOperations,
  subscribe: subscribeIndexer,
  unsubscribe: unsubscribeIndexer,
  subscribeEvents,
  unsubscribeEvents,
};
