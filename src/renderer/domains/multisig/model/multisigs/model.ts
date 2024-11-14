import { type ApiPromise } from '@polkadot/api';
import { createStore } from 'effector';
import { cloneDeep } from 'lodash';

import { type CallHash, type ChainId, type HexString } from '@/shared/core';
import { createDataSource, createDataSubscription } from '@/shared/effector';
import { nullable, setNestedValue } from '@/shared/lib/utils';
import { multisigPallet } from '@/shared/pallet/multisig';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';
import { type AccountId } from '@/shared/polkadotjs-schemas';

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

      newStore = setNestedValue(
        store,
        chainId,
        accountId,
        multisigOperationService.mergeMultisigOperations(store[chainId]?.[accountId] || [], result[chainId] || []),
      );
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
    const unsubscribe: Promise<void | (() => void)>[] = [];

    for (const { accountId, api } of params) {
      unsubscribe.push(
        polkadotjsHelpers
          .subscribeSystemEvents(
            {
              api,
              section: `multisig`,
              methods: ['MultisigApproval', 'MultisigExecuted', 'MultisigCancelled'],
            },
            event => {
              const accountIdId = 0;
              const timepointId = 1;
              const multisigId = 2;
              const callHashId = 3;

              if (event.data[multisigId]?.toHex() !== accountId) return;

              const blockCreated = (event.data[timepointId] as any).height.toNumber();
              const indexCreated = (event.data[timepointId] as any).index.toNumber();

              callback({
                done: true,
                value: {
                  multisigId: accountId,
                  chainId: api.genesisHash.toHex(),
                  callHash: event.data[callHashId]!.toHex(),
                  accountId: event.data[accountIdId]!.toHex() as AccountId,
                  status: event.method === 'MultisigCancelled' ? 'rejected' : 'approved',
                  indexCreated,
                  blockCreated,
                },
              });
            },
          )
          .then(unsubscribe => {
            unsubscribe();
          }),
      );
    }

    return () => {
      Promise.all(unsubscribe);
    };
  },
  map: (store, { result: { callHash, multisigId, chainId, ...event } }) => {
    const newStore = cloneDeep(store);

    newStore[chainId] = newStore[chainId] || {};
    newStore[chainId][multisigId] = newStore[chainId][multisigId] || [];

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
