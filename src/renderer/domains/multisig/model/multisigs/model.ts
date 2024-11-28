import { type ApiPromise } from '@polkadot/api';
import { type Event } from '@polkadot/types/interfaces/system';
import { createStore } from 'effector';
import { cloneDeep } from 'lodash';

import { type CallHash, type ChainId, type HexString } from '@/shared/core';
import { createDataSource, createDataSubscription } from '@/shared/effector';
import { nullable, setNestedValue } from '@/shared/lib/utils';
import { multisigPallet } from '@/shared/pallet/multisig';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { MultisigEventFieldIndex } from './constants';
import { multisigOperationService } from './service';
import { type Multisig, type MultisigEvent } from './types';

type Store = Record<ChainId, Record<AccountId, Multisig[]>>;

type RequestParams = {
  accountId: AccountId;
  api: ApiPromise;
};

const $multisigOperations = createStore<Store>({});

const { request } = createDataSource<Store, RequestParams[], Record<ChainId, Multisig[]>>({
  initial: $multisigOperations,
  async fn(inputs) {
    const result: Record<ChainId, Multisig[]> = {};

    for (const { api, accountId } of inputs) {
      const response = await multisigPallet.storage.multisigs(api, accountId);
      const chainId = api.genesisHash.toHex();

      for (const multisig of response) {
        if (nullable(multisig.multisig)) continue;
        result[chainId] = result[chainId] || [];

        result[chainId].push({
          status: 'pending',
          accountId: multisig.key.accountId,
          callHash: multisig.key.callHash as HexString,
          depositor: multisig.multisig.depositor,
          events: multisig.multisig.approvals.map(accountId => ({
            accountId,
            status: 'approved',
            blockCreated: multisig.multisig!.when.height,
            indexCreated: multisig.multisig!.when.index,
          })),
          blockCreated: multisig.multisig.when.height,
          indexCreated: multisig.multisig.when.index,
          deposit: multisig.multisig.deposit,
        });
      }
    }

    return result;
  },
  map(store, { params, result }) {
    let newStore = {};

    for (const { api, accountId } of params) {
      const chainId = api.genesisHash.toHex();
      const oldOperations = store[chainId]?.[accountId] || [];
      const newOperations = result[chainId] || [];
      const multisigOperations = multisigOperationService.mergeMultisigOperations(oldOperations, newOperations);

      newStore = setNestedValue(store, chainId, accountId, multisigOperations);
    }

    return newStore;
  },
});

const { subscribe, unsubscribe } = createDataSubscription<
  Store,
  RequestParams[],
  { callHash: CallHash; multisigId: AccountId; chainId: ChainId } & MultisigEvent
>({
  initial: $multisigOperations,
  fn: (params, callback) => {
    const unsubscribeFns: Promise<void | VoidFunction>[] = [];

    for (const { accountId, api } of params) {
      const subscribeEventCallback = (event: Event) => {
        if (event.data[MultisigEventFieldIndex.MULTISIG]?.toHex() !== accountId) return;

        const blockCreated = (event.data[MultisigEventFieldIndex.TIMEPOINT] as any).height.toNumber();
        const indexCreated = (event.data[MultisigEventFieldIndex.TIMEPOINT] as any).index.toNumber();

        callback({
          done: true,
          value: {
            multisigId: accountId,
            chainId: api.genesisHash.toHex(),
            callHash: event.data[MultisigEventFieldIndex.CALL_HASH]!.toHex(),
            accountId: event.data[MultisigEventFieldIndex.ACCOUNT_ID]!.toHex() as AccountId,
            status: event.method === 'MultisigCancelled' ? 'rejected' : 'approved',
            indexCreated,
            blockCreated,
          },
        });
      };

      const unsubscribeFn = polkadotjsHelpers
        .subscribeSystemEvents(
          {
            api,
            section: `multisig`,
            // TODO: add NewMultisig event
            methods: ['MultisigApproval', 'MultisigExecuted', 'MultisigCancelled'],
          },
          subscribeEventCallback,
        )
        .then(unsubscribe => unsubscribe());

      unsubscribeFns.push(unsubscribeFn);
    }

    return () => {
      Promise.all(unsubscribeFns);
    };
  },
  map: (store, { result: { callHash, multisigId, chainId, ...event } }) => {
    const newStore = cloneDeep(store);

    if (!newStore[chainId]) {
      newStore[chainId] = {};
    }

    if (!newStore[chainId][multisigId]) {
      newStore[chainId][multisigId] = [];
    }

    const multisig = newStore[chainId][multisigId].find(
      multisig => multisig.callHash === callHash && multisig.status === 'pending',
    );

    if (multisig) {
      multisig.events = multisigOperationService.mergeEvents(multisig.events, [event]);
    }

    return newStore;
  },
});

export const multisigsDomainModel = {
  $multisigOperations,

  request,
  subscribe,
  unsubscribe,
};
