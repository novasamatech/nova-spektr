import { type Done, persist } from '@effector-storage/idb-keyval';
import { type ApiPromise } from '@polkadot/api';
import { attach, combine, createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import { produce } from 'immer';
import { uniqBy } from 'lodash';
import { and, once, readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { type Chain, type ChainId, type HexString } from '@/shared/core';
import { series } from '@/shared/effector';
import { entries, getNativeAssetId, groupBy, keys, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query/types';
import { networkModel } from '@/entities/network';
import { decodeCallData } from '@/entities/transaction';

import {
  $completionEvents,
  $offChainOperations,
  $onChainOperationsByCallhash,
  $trackedCallHashes,
  fetchOffchainResource,
  initialOnChainFetch,
  subscribeEventsResource,
  subscribeNewMultisigEventsResource,
  subscribeOnchainResource,
} from './resource';
import { deserializeOperation, serializeOperation } from './service';
import { type MultisigOperation } from './types';

const subscribeToAccounts = createEvent<{
  apis: Record<ChainId, ApiPromise>;
  accountIds: AccountId[];
  chains: Record<ChainId, Chain>;
}>();

const unsubscribeFromAccounts = createEvent();

const $subscribedAccounts = createStore<AccountId[]>([]);
const $subscribedApis = createStore<Record<ChainId, ApiPromise>>({});

const $chainIdsWithMultisigSupport = createStore<Set<ChainId>>(new Set()).reset(unsubscribeFromAccounts);
const $initializedChainIds = createStore<Set<ChainId>>(new Set()).reset(unsubscribeFromAccounts);

const $onChainOperations = $onChainOperationsByCallhash.map(state =>
  Object.values(state)
    .flatMap(chainOperations =>
      Object.values(chainOperations).flatMap(accountOperations => Object.values(accountOperations)),
    )
    .filter(nonNullable),
);

const $initialOnChainFetched = combine(
  { expected: $chainIdsWithMultisigSupport, fetched: $initializedChainIds },
  ({ expected, fetched }) => {
    if (expected.size === 0) return false;
    return Array.from(expected).every(chainId => fetched.has(chainId));
  },
);

const $offChainFetched = createStore(false)
  .on(fetchOffchainResource.fetch.done, () => true)
  .reset(unsubscribeFromAccounts);

const $initialLoadingComplete = and($initialOnChainFetched, $offChainFetched);

const populateFx = createEffect(() =>
  storageService.multisigOperations.readAll().then(txs => txs.map(deserializeOperation)),
);

const updateOperationsFx = createEffect(async (operations: MultisigOperation[]) => {
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

const $removedFromChainStorageOperations = createStore<MultisigOperation[]>([]);

sample({
  clock: subscribeOnchainResource.push,
  source: {
    onChainOperationsByCallhash: $onChainOperationsByCallhash,
    removedOperations: $removedFromChainStorageOperations,
  },
  fn: ({ onChainOperationsByCallhash, removedOperations }, clockData) => {
    const { chainId, operations } = clockData.result;
    const chainOperations = onChainOperationsByCallhash[chainId] || {};

    const newRemovedOperations: MultisigOperation[] = [];
    for (const [accountId, accountOperations] of entries(operations)) {
      const removedHashes = keys(accountOperations).filter(hash => accountOperations[hash] === null);
      const accountChainOperations = chainOperations[accountId] || {};
      for (const hash of removedHashes) {
        const operation = accountChainOperations[hash];
        if (operation) {
          newRemovedOperations.push(operation);
        }
      }
    }

    return removedOperations.concat(newRemovedOperations);
  },
  target: $removedFromChainStorageOperations,
});

sample({
  clock: subscribeOnchainResource.push,
  source: $onChainOperationsByCallhash,
  fn: (cache, { result: { chainId, operations } }) => {
    return produce(cache, draft => {
      if (!draft[chainId]) {
        draft[chainId] = {};
      }
      for (const [accountId, accountOperations] of entries(operations)) {
        if (!draft[chainId][accountId]) {
          draft[chainId][accountId] = {};
        }
        for (const [callHash, operation] of entries(accountOperations)) {
          draft[chainId][accountId][callHash] = operation;
        }
      }
    });
  },
  target: $onChainOperationsByCallhash,
});

const getSubscriptionKeys = (accountIds: AccountId[], apis: Record<ChainId, ApiPromise>): ResourceRequestKey[] => {
  return accountIds.flatMap(accountId =>
    Object.values(apis).map(api => `${api.genesisHash.toHex()}-${accountId}` as ResourceRequestKey),
  );
};

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

// Prevents premature cache invalidation when some APIs haven't connected yet
sample({
  clock: subscribeToAccounts,
  fn: ({ chains }) => new Set(keys(chains)),
  target: $chainIdsWithMultisigSupport,
});

sample({
  clock: initialOnChainFetch.fetch.done,
  source: $initializedChainIds,
  fn: (fetched, { params }) => {
    const chainIds = keys(params.apis);
    return new Set([...fetched, ...chainIds]);
  },
  target: $initializedChainIds,
});

sample({
  clock: subscribeToAccounts,
  fn: ({ apis, accountIds, chains }) => ({ apis, chains, accountIds }),
  target: [initialOnChainFetch.fetch, fetchOffchainResource.fetch],
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

sample({
  clock: unsubscribeFromAccounts,
  source: $subscribedApis,
  fn: apis => Object.values(apis).map(api => api.genesisHash.toHex() as ResourceRequestKey),
  target: series(subscribeOnchainResource.unsubscribe, { parallel: true }),
});

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

sample({
  clock: unsubscribeFromAccounts,
  target: [
    $trackedCallHashes.reinit!,
    $offChainOperations.reinit!,
    $onChainOperationsByCallhash.reinit!,
    $completionEvents.reinit!,
    $removedFromChainStorageOperations.reinit!,
  ],
});

const $completedLiveOperations = combine(
  {
    completionEvents: $completionEvents,
    removedOperations: $removedFromChainStorageOperations,
  },
  ({ completionEvents, removedOperations }) => {
    if (!completionEvents.length || !removedOperations.length) return [];

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

/**
 * Data sources:
 *
 * - $onChainOperations: pending operations from chain storage (disappears when
 *   completed)
 * - $completedLiveOperations: just-completed operations from event subscriptions
 * - $offChainOperations: completed operations from indexer (~30s delayed)
 * - $cachedOperations: IndexedDB cache for fast initial render
 */

const $cachedOperations = createStore<MultisigOperation[]>([]);
const cachedOperationsLoaded = createEvent<Done<MultisigOperation[]>>();

const $populated = restore(
  once(cachedOperationsLoaded).map(() => true),
  false,
);

persist({ store: $cachedOperations, key: 'multisig-operations', done: cachedOperationsLoaded });

const $liveOperations = combine(
  {
    onChain: $onChainOperations,
    completedLiveOperations: $completedLiveOperations,
    offChain: $offChainOperations,
  },
  ({ onChain, completedLiveOperations, offChain }) => {
    return uniqBy(onChain.concat(completedLiveOperations).concat(offChain), o => o.id);
  },
);

const $allOperations = combine(
  {
    live: $liveOperations,
    cached: $cachedOperations,
    fetchedChainIds: $initializedChainIds,
    expectedChainIds: $chainIdsWithMultisigSupport,
  },
  ({ live, cached, fetchedChainIds, expectedChainIds }) => {
    if (expectedChainIds.size === 0) {
      return cached;
    }

    const allFetched = Array.from(expectedChainIds).every(chainId => fetchedChainIds.has(chainId));
    if (allFetched) {
      return live;
    }

    // Hybrid: use live data for fetched chains, cached for others
    const liveByChain = groupBy(live, op => op.chainId);
    const cachedByChain = groupBy(cached, op => op.chainId);
    const allChainIds = new Set([...keys(liveByChain), ...keys(cachedByChain)]);

    const result: MultisigOperation[] = [];
    for (const chainId of allChainIds) {
      const ops = fetchedChainIds.has(chainId) ? liveByChain[chainId] || [] : cachedByChain[chainId] || [];
      result.push(...ops);
    }

    return uniqBy(result, o => o.id);
  },
);

sample({
  clock: $liveOperations,
  source: $initialLoadingComplete,
  filter: loadingComplete => loadingComplete,
  fn: (_, liveOps) => liveOps,
  target: $cachedOperations,
});

sample({
  clock: updateCallDataFx.doneData,
  target: $callDataUpdated,
});

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
  $onChainReady: readonly($initialOnChainFetched),
  $offChainReady: readonly($offChainFetched),

  subscribeToAccounts,
  unsubscribeFromAccounts,
  refetchOffchainOperations,

  populate: populateFx,
  updateOperations: updateOperationsFx,
  updateCallData: updateCallDataFx,
  requestOffchainOperations: fetchOffchainResource.start,
  initialOnChainFetch: initialOnChainFetch.start,

  __test: {
    $list: $allOperations,
    $populated,
    $cachedOperations,
    $expectedChainIds: $chainIdsWithMultisigSupport,
    $fetchedChainIds: $initializedChainIds,
    $offChainReady: $offChainFetched,
    $onChainReady: $initialOnChainFetched,
  },
};
