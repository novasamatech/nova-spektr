import { type ApiPromise } from '@polkadot/api';
import { combine, createStore } from 'effector';
import { spread } from 'patronum';

import { type ChainId } from '@/shared/core';
import { createDataSource, createDataSubscription } from '@/shared/effector';
import { nullable } from '@/shared/lib/utils';
import { multisigPallet } from '@/shared/pallet/multisig';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { multisigEvent } from './schema';
import { operationsService } from './service';
import { type MultisigEvent, type MultisigOperation } from './types';

type RequestParams = {
  accountId: AccountId;
  api: ApiPromise;
};

const $operations = createStore<Record<ChainId, MultisigOperation[]>>({});
const $events = createStore<Record<ChainId, MultisigEvent[]>>({});

const { request: requestOperations } = createDataSource({
  source: combine({ operations: $operations, events: $events }),
  target: spread({ operations: $operations, events: $events }),
  async fn({ api, accountId }: RequestParams) {
    const operations: MultisigOperation[] = [];
    let events: MultisigEvent[] = [];

    const response = await multisigPallet.storage.multisigs(api, accountId);
    const chainId = api.genesisHash.toHex();

    for (const { key, multisig } of response) {
      if (nullable(multisig)) continue;

      operations.push({
        chainId,
        status: 'pending',
        accountId: key.accountId,
        callHash: key.callHash,
        depositor: multisig.depositor,
        blockCreated: multisig.when.height,
        indexCreated: multisig.when.index,
        deposit: multisig.deposit,
      });

      events = events.concat(
        multisig.approvals.map(accountId => ({
          chainId,
          accountId,
          status: 'approved',
          callHash: key.callHash,
          blockCreated: multisig.when.height,
          indexCreated: multisig.when.index,
        })),
      );
    }

    return { operations, events };
  },
  map({ operations, events }, { params: { api }, result }) {
    const chainId = api.genesisHash.toHex();

    const oldOperations = operations[chainId] ?? [];
    const newOperations = operationsService.mergeMultisigOperations(oldOperations, result.operations);

    const oldEvents = events[chainId] ?? [];
    const newEvents = operationsService.mergeEvents(oldEvents, result.events);

    return {
      operations: {
        ...operations,
        [chainId]: newOperations,
      },
      events: {
        ...events,
        [chainId]: newEvents,
      },
    };
  },
});

const { subscribe: subscribeEvents, unsubscribe: unsubscribeEvents } = createDataSubscription<
  Record<ChainId, MultisigEvent[]>,
  RequestParams[],
  { event: MultisigEvent; chainId: ChainId }
>({
  initial: $events,
  fn: (params, callback) => {
    const unsubscribeFns: Promise<VoidFunction>[] = [];

    for (const { accountId, api } of params) {
      const chainId = api.genesisHash.toHex();

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

          callback({
            done: true,
            value: {
              chainId: api.genesisHash.toHex(),
              event: {
                chainId,
                accountId: data.account,
                status: event.method === 'MultisigCancelled' ? 'rejected' : 'approved',
                callHash: data.callHash,
                indexCreated: data.timepoint.index,
                blockCreated: data.timepoint.height,
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
  map: (store, { result: { chainId, event } }) => {
    const oldEvents = store[chainId] ?? [];
    const newEvents = operationsService.mergeEvents(oldEvents, [event]);

    return {
      ...store,
      [chainId]: newEvents,
    };
  },
});

export const operationsDomainModel = {
  $operations,
  $events,

  requestOperations,
  subscribeEvents,
  unsubscribeEvents,
};
