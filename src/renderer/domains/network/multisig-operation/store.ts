import { type ApiPromise } from '@polkadot/api';
import { attach, combine, createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import { produce } from 'immer';
import { uniqBy } from 'lodash';
import { once, readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { type Chain, type ChainId, type HexString } from '@/shared/core';
import { series } from '@/shared/effector';
import { entries, getNativeAssetId, groupBy, keys, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query/types';
import { networkModel } from '@/entities/network';
import { decodeCallData } from '@/entities/transaction';

import {
  $offChainOperations,
  fetchOffchainResource,
  initialOnChainFetch,
  subscribeEventsResource,
  subscribeNewMultisigEventsResource,
  subscribeOnchainResource,
} from './resource';
import { deserializeOperation, serializeOperation } from './service';
import { type MultisigEvent, type MultisigOperation } from './types';

const subscribeToAccounts = createEvent<{
  apis: Record<ChainId, ApiPromise>;
  accountIds: AccountId[];
  chains: Record<ChainId, Chain>;
}>();

const unsubscribeFromAccounts = createEvent();

// Track the current subscribed accounts
const $subscribedAccounts = createStore<AccountId[]>([]);
const $subscribedApis = createStore<Record<ChainId, ApiPromise>>({});

const $trackedCallHashes = createStore<Record<ChainId, { api: ApiPromise; hashes: Record<AccountId, HexString[]> }>>(
  {},
);

const $onChainOperationsByCallhash = createStore<Record<HexString, MultisigOperation | null>>({});
const $onChainOperations = $onChainOperationsByCallhash.map(state => Object.values(state).filter(nonNullable));

const $initialOnChainFetched = createStore(false)
  .on(initialOnChainFetch.fetch.finally, (_, effect) => effect.status === 'done')
  .reset(unsubscribeFromAccounts);

const $offChainFetched = createStore(false)
  .on(fetchOffchainResource.fetch.finally, (_, effect) => {
    return effect.status === 'done';
  })
  .reset(unsubscribeFromAccounts);

const $initialLoadingComplete = combine(
  $initialOnChainFetched,
  $offChainFetched,
  (onChain, offChain) => onChain && offChain,
);

const populateFx = createEffect(() =>
  storageService.multisigOperations.readAll().then(txs => txs.map(deserializeOperation)),
);

const updateOperationsFx = createEffect((operations: MultisigOperation[]) => {
  return storageService.multisigOperations.updateAll(operations.map(serializeOperation)).then(() => operations);
});

const $callDataUpdated = createStore<MultisigOperation | null>(null);

type UpdateCallDataParams = {
  operation: MultisigOperation;
  callData: HexString;
};

const updateCallDataFx = attach({
  source: {
    apis: networkModel.$apis,
    chains: networkModel.$chains,
  },
  async effect({ apis, chains }, { operation, callData }: UpdateCallDataParams) {
    const update = scopeBind(updateOperationsFx, { safe: true });
    const api = apis[operation.chainId];
    const chain = chains[operation.chainId];
    if (!api || !chain) {
      throw new Error(`Api from tx not found: ${operation.chainId}`);
    }
    try {
      const decoded = decodeCallData(api, operation.accountId, callData, getNativeAssetId(chain.assets));
      const newOperation: MultisigOperation = {
        ...operation,
        section: decoded.section,
        method: decoded.method,
        callData,
        transaction: decoded,
      };

      await update([newOperation]);
      return newOperation;
    } catch (error) {
      console.error(error);
      return null;
    }
  },
});

sample({
  clock: initialOnChainFetch.push,
  source: $onChainOperationsByCallhash,
  fn: (state, { result: { onChainData } }) => {
    return { ...state, ...onChainData };
  },
  target: $onChainOperationsByCallhash,
});

sample({
  clock: initialOnChainFetch.push,
  source: $trackedCallHashes,
  fn: (state, { params, result: { callHashesByChain } }) => {
    const { apis, accountIds } = params;
    return produce(state, draft => {
      for (const [chainId, api] of entries(apis)) {
        const existing = draft[chainId] || { api, hashes: {} };
        const fetchedHashes = callHashesByChain[chainId] || {};

        const newHashesMap = { ...existing.hashes };

        for (const accountId of accountIds) {
          newHashesMap[accountId] = fetchedHashes[accountId] || [];
        }

        draft[chainId] = {
          api,
          hashes: newHashesMap,
        };
      }
    });
  },
  target: $trackedCallHashes,
});

sample({
  clock: $trackedCallHashes,
  source: {
    chains: networkModel.$chains,
  },
  fn: ({ chains }, state) => {
    const values = Object.values(state).map(el => ({
      api: el.api,
      hashes: el.hashes,
      chain: chains[el.api.genesisHash.toHex()]!,
    }));

    return values;
  },
  target: series(subscribeOnchainResource.subscribe, { parallel: true }),
});

const $removedOperations = createStore<MultisigOperation[]>([]);

sample({
  clock: subscribeOnchainResource.push,
  source: { onChainOperationsByCallhash: $onChainOperationsByCallhash, removedOperations: $removedOperations },
  fn: ({ onChainOperationsByCallhash, removedOperations }, clockData) => {
    const removedOperationsHashes = keys(clockData.result).filter(key => clockData.result[key] === null);
    const newRemovedOperations = removedOperationsHashes
      .map(hash => onChainOperationsByCallhash[hash])
      .filter(nonNullable);

    return removedOperations.concat(newRemovedOperations);
  },
  target: $removedOperations,
});

sample({
  clock: subscribeOnchainResource.push,
  source: $onChainOperationsByCallhash,
  fn: (state, clockData) => {
    return {
      ...state,
      ...clockData.result,
    };
  },
  target: $onChainOperationsByCallhash,
});

sample({
  clock: subscribeNewMultisigEventsResource.push,
  source: $trackedCallHashes,
  fn: (state, { params, result }) =>
    produce(state, draft => {
      const chainId = params.api.genesisHash.toHex();

      // Ensure the chain entry exists (fixes race condition when NewMultisig arrives before initialOnChainFetch)
      if (!draft[chainId]) {
        draft[chainId] = { api: params.api, hashes: {} };
      }

      // Ensure the account hashes array exists
      if (!draft[chainId].hashes[params.accountId]) {
        draft[chainId].hashes[params.accountId] = [];
      }

      draft[chainId].hashes[params.accountId]!.push(result);
    }),
  target: $trackedCallHashes,
});

// Helper function to generate unsubscribe keys for accounts and apis
const getSubscriptionKeys = (accountIds: AccountId[], apis: Record<ChainId, ApiPromise>): ResourceRequestKey[] => {
  return accountIds.flatMap(accountId =>
    Object.values(apis).map(api => `${api.genesisHash.toHex()}-${accountId}` as ResourceRequestKey),
  );
};

// Unsubscribe from previous accounts when subscribing
sample({
  clock: subscribeToAccounts,
  source: { subscribedAccounts: $subscribedAccounts, subscribedApis: $subscribedApis },
  filter: ({ subscribedAccounts }) => subscribedAccounts.length > 0,
  fn: ({ subscribedAccounts, subscribedApis }) => {
    return getSubscriptionKeys(subscribedAccounts, subscribedApis);
  },
  target: series(subscribeNewMultisigEventsResource.unsubscribe, { parallel: true }),
});

sample({
  clock: subscribeToAccounts,
  source: { subscribedAccounts: $subscribedAccounts, subscribedApis: $subscribedApis },
  filter: ({ subscribedAccounts }) => subscribedAccounts.length > 0,
  fn: ({ subscribedAccounts, subscribedApis }) => {
    return getSubscriptionKeys(subscribedAccounts, subscribedApis);
  },
  target: series(subscribeEventsResource.unsubscribe, { parallel: true }),
});

// Track the current subscribed accounts and apis
sample({
  clock: subscribeToAccounts,
  fn: ({ accountIds }) => accountIds,
  target: $subscribedAccounts,
});

sample({
  clock: subscribeToAccounts,
  fn: ({ apis }) => apis,
  target: $subscribedApis,
});

sample({
  clock: subscribeToAccounts,
  fn: ({ apis, accountIds, chains }) => ({ apis, chains, accountIds }),
  target: [initialOnChainFetch.start, fetchOffchainResource.start],
});

const refetchOffchainOperations = createEvent();

sample({
  clock: refetchOffchainOperations,
  source: {
    apis: $subscribedApis,
    accountIds: $subscribedAccounts,
    chains: networkModel.$chains,
  },
  filter: ({ accountIds }) => accountIds.length > 0,
  target: fetchOffchainResource.start,
});

sample({
  clock: subscribeToAccounts,
  fn: ({ accountIds, apis }) => accountIds.flatMap(accountId => Object.values(apis).map(api => ({ api, accountId }))),
  target: series(subscribeNewMultisigEventsResource.subscribe, { parallel: true }),
});

sample({
  clock: subscribeToAccounts,
  fn: ({ accountIds, apis }) => accountIds.flatMap(accountId => Object.values(apis).map(api => ({ api, accountId }))),
  target: series(subscribeEventsResource.subscribe, { parallel: true }),
});

sample({
  clock: subscribeNewMultisigEventsResource.push,
  source: {
    apis: $subscribedApis,
    accountIds: $subscribedAccounts,
    chains: networkModel.$chains,
  },
  filter: ({ accountIds }) => accountIds.length > 0,
  target: fetchOffchainResource.start,
});

// Handle explicit unsubscribe (e.g., when feature stops)
sample({
  clock: unsubscribeFromAccounts,
  source: { subscribedAccounts: $subscribedAccounts, subscribedApis: $subscribedApis },
  filter: ({ subscribedAccounts }) => subscribedAccounts.length > 0,
  fn: ({ subscribedAccounts, subscribedApis }) => {
    return getSubscriptionKeys(subscribedAccounts, subscribedApis);
  },
  target: series(subscribeNewMultisigEventsResource.unsubscribe, { parallel: true }),
});

sample({
  clock: unsubscribeFromAccounts,
  source: { subscribedAccounts: $subscribedAccounts, subscribedApis: $subscribedApis },
  filter: ({ subscribedAccounts }) => subscribedAccounts.length > 0,
  fn: ({ subscribedAccounts, subscribedApis }) => {
    return getSubscriptionKeys(subscribedAccounts, subscribedApis);
  },
  target: series(subscribeEventsResource.unsubscribe, { parallel: true }),
});

// Unsubscribe from on-chain storage resource and clear tracking
sample({
  clock: unsubscribeFromAccounts,
  source: $subscribedApis,
  fn: apis => Object.values(apis).map(api => api.genesisHash.toHex() as ResourceRequestKey),
  target: series(subscribeOnchainResource.unsubscribe, { parallel: true }),
});

// Clear tracking state when unsubscribing
sample({
  clock: unsubscribeFromAccounts,
  fn: () => [],
  target: $subscribedAccounts,
});

sample({
  clock: unsubscribeFromAccounts,
  fn: () => ({}),
  target: $subscribedApis,
});

const $completionEvents = createStore<{ chainId: ChainId; operationId: string; event: MultisigEvent }[]>([]);

// Reset internal stores
sample({
  clock: unsubscribeFromAccounts,
  target: [
    $trackedCallHashes.reinit!,
    $offChainOperations.reinit!,
    $onChainOperationsByCallhash.reinit!,
    $completionEvents.reinit!,
    $removedOperations.reinit!,
  ],
});

sample({
  clock: subscribeEventsResource.push,
  source: $completionEvents,
  fn: (state, { params, result }) => {
    return [
      ...state,
      { chainId: params.api.genesisHash.toHex(), operationId: result.operationId, event: result.event },
    ];
  },
  target: $completionEvents,
});

const $completedLiveOperations = combine(
  {
    completionEvents: $completionEvents,
    removedOperations: $removedOperations,
  },
  ({ completionEvents, removedOperations }) => {
    const eventsByOperationId = groupBy(completionEvents, event => event.operationId);
    return removedOperations.map(op => {
      const events = eventsByOperationId[op.id];

      if (!events || events.length === 0) return op;

      const newEvents = uniqBy(op.events.concat(events.map(e => e.event)), e => e.id);
      const newStatus = newEvents.find(e => e.status === 'reject') ? 'cancelled' : 'executed';
      return { ...op, events: newEvents, status: newStatus };
    }) satisfies MultisigOperation[];
  },
);

const $allOperations = combine(
  {
    onChain: $onChainOperations,
    completedLiveOperations: $completedLiveOperations,
    offChain: $offChainOperations,
  },
  ({ onChain, completedLiveOperations, offChain }) => {
    return uniqBy(onChain.concat(completedLiveOperations).concat(offChain), o => o.id);
  },
);

const $populated = restore(
  once($allOperations.updates).map(() => true),
  false,
);

// Handle successful call data updates
sample({
  clock: updateCallDataFx.doneData,
  target: $callDataUpdated,
});

// Clear the last updated operation when new update starts
sample({
  clock: updateCallDataFx,
  fn: () => null,
  target: $callDataUpdated,
});

export const multisigOperation = {
  $list: $allOperations,
  $populated: readonly($populated),
  $callDataUpdated,
  $initialLoadingComplete,

  //API
  subscribeToAccounts,
  unsubscribeFromAccounts,
  refetchOffchainOperations,

  populate: populateFx,
  updateOperations: updateOperationsFx,
  updateCallData: updateCallDataFx,
  requestOffchainOperations: fetchOffchainResource.start,
  initialOnChainFetch: initialOnChainFetch.start,

  __test: {
    $list: $offChainOperations,
    $populated,
    $initialOnChainFetched,
    $offChainFetched,
  },
};
