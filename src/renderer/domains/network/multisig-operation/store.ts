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

// Track expected chains (the complete set we should wait for)
const $expectedChainIds = createStore<Set<ChainId>>(new Set()).reset(unsubscribeFromAccounts);

// Track which chains have successfully completed their initial fetch
const $fetchedChainIds = createStore<Set<ChainId>>(new Set()).reset(unsubscribeFromAccounts);

const $onChainOperations = $onChainOperationsByCallhash.map(state =>
  Object.values(state)
    .flatMap(chainOperations =>
      Object.values(chainOperations).flatMap(accountOperations => Object.values(accountOperations)),
    )
    .filter(nonNullable),
);

// Initial on-chain fetch is complete when ALL expected chains have been fetched
const $initialOnChainFetched = combine(
  { expected: $expectedChainIds, fetched: $fetchedChainIds },
  ({ expected, fetched }) => {
    if (expected.size === 0) return false;
    // Check if all expected chains have been fetched
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
        // Update each operation individually to avoid losing any existing operations
        for (const [callHash, operation] of entries(accountOperations)) {
          draft[chainId][accountId][callHash] = operation;
        }
      }
    });
  },
  target: $onChainOperationsByCallhash,
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

// Track expected chains - the complete set we need to wait for
// This prevents premature cache invalidation when some APIs haven't connected yet
// chains parameter is already filtered to multisig-supported chains with user accounts
sample({
  clock: subscribeToAccounts,
  fn: ({ chains }) => new Set(keys(chains)),
  target: $expectedChainIds,
});

// Mark chains as fetched when initial on-chain fetch completes
// Only when ALL expected chains have been fetched will $initialOnChainFetched become true
sample({
  clock: initialOnChainFetch.fetch.done,
  source: $fetchedChainIds,
  fn: (fetched, { params }) => {
    const chainIds = keys(params.apis);
    return new Set([...fetched, ...chainIds]);
  },
  target: $fetchedChainIds,
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
    $removedFromChainStorageOperations.reinit!,
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
    removedOperations: $removedFromChainStorageOperations,
  },
  ({ completionEvents, removedOperations }) => {
    console.log('completedLiveOperations', completionEvents, removedOperations);
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
 * Data source architecture:
 *
 * LIVE SOURCES (authoritative, used when available):
 *
 * 1. $onChainOperations - Pending operations from chain storage (reliable,
 *    real-time) Limitation: Disappears when operation completes
 * 2. $completedLiveOperations - Just completed operations (reliable, real-time)
 *    Source: Event subscriptions catching operations as they execute/reject
 * 3. $offChainOperations - Completed operations from indexer (reliable, ~30s
 *    delayed) Limitation: Works with finalized blocks, has delay
 *
 * CACHE (for fast initial render):
 *
 * - $cachedOperations - IndexedDB cache of all operations Purpose: Show data
 *   immediately on page load Updated: Synced with live sources after initial
 *   load completes Replaced: Entirely by live data once $initialLoadingComplete
 *   is true
 */

// Cache store for faster initial load - persisted to IndexedDB
const $cachedOperations = createStore<MultisigOperation[]>([]);
const cachedOperationsLoaded = createEvent<Done<MultisigOperation[]>>();
persist({ store: $cachedOperations, key: 'multisig-operations', done: cachedOperationsLoaded });

// Derive the combined operations list from live sources
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

/**
 * Hybrid data source strategy:
 *
 * Instead of all-or-nothing (show cache until ALL chains load, then switch to
 * live), we use a per-chain approach:
 *
 * - For initialized chains (in $fetchedChainIds): use live data (authoritative)
 * - For non-initialized chains: use cached data (best available)
 *
 * This ensures users see immediate updates when operations change on
 * initialized chains, without waiting for all chains to load. For example, if a
 * user rejects an operation on chain A while chain B is still loading, they'll
 * see the updated state for chain A immediately, while chain B continues to
 * show cached data.
 */
const $allOperations = combine(
  {
    live: $liveOperations,
    cached: $cachedOperations,
    fetchedChainIds: $fetchedChainIds,
    expectedChainIds: $expectedChainIds,
  },
  ({ live, cached, fetchedChainIds, expectedChainIds }) => {
    // If no chains expected yet (subscription not started), use cached data
    if (expectedChainIds.size === 0) {
      return cached;
    }

    // Optimization: if all chains are fetched, use live data entirely
    const allFetched = Array.from(expectedChainIds).every(chainId => fetchedChainIds.has(chainId));
    if (allFetched) {
      return live;
    }

    // Hybrid approach: combine live data for initialized chains with cached data for others
    const liveByChain = groupBy(live, op => op.chainId);
    const cachedByChain = groupBy(cached, op => op.chainId);

    // Collect all chain IDs from both sources
    const allChainIds = new Set([...keys(liveByChain), ...keys(cachedByChain)]);

    const result: MultisigOperation[] = [];

    for (const chainId of allChainIds) {
      if (fetchedChainIds.has(chainId)) {
        // Chain is initialized - use live data (authoritative, even if empty)
        const liveOps = liveByChain[chainId] || [];
        result.push(...liveOps);
      } else {
        // Chain not yet initialized - use cached data (best available)
        const cachedOps = cachedByChain[chainId] || [];
        result.push(...cachedOps);
      }
    }

    return uniqBy(result, o => o.id);
  },
);

// Update cache with live data once initial loading is complete and on subsequent changes
sample({
  clock: $liveOperations,
  source: $initialLoadingComplete,
  filter: loadingComplete => loadingComplete,
  fn: (_, liveOps) => liveOps,
  target: $cachedOperations,
});

const $populated = restore(
  once(cachedOperationsLoaded).map(() => true),
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
  $onChainReady: readonly($initialOnChainFetched),
  $offChainReady: readonly($offChainFetched),

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
    $list: $allOperations,
    $populated,
    // For tests: expose writable stores instead of computed ones
    $cachedOperations, // Use this to set operation list in tests
    $expectedChainIds,
    $fetchedChainIds,
    $offChainReady: $offChainFetched,
    // Keep computed store for backward compatibility but tests should use $expectedChainIds/$fetchedChainIds
    $onChainReady: $initialOnChainFetched,
  },
};
