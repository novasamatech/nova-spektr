import { type ApiPromise } from '@polkadot/api';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { produce } from 'immer';
import { uniqBy } from 'lodash';
import { and, once, readonly } from 'patronum';

import { type Done, persist } from '@/shared/api/storage';
import {
  type CallData,
  type Chain,
  type ChainId,
  type DecodedTransaction,
  type HexString,
  AccountType,
} from '@/shared/core';
import { series } from '@/shared/effector';
import { entries, groupBy, keys, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query/types';
import { networkModel } from '@/entities/network';
import { accounts } from '../account/store';

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
import { multisigOperationService } from './service';
import { type MultisigOperation } from './types';

const subscribeToAccounts = createEvent<{
  apis: Record<ChainId, ApiPromise>;
  accountIds: AccountId[];
  chains: Record<ChainId, Chain>;
}>();

const unsubscribeFromAccounts = createEvent();

const $subscribedAccounts = createStore<AccountId[]>([]);
const $subscribedApis = createStore<Record<ChainId, ApiPromise>>({});

const $chainIdsWithMultisigSupport = createStore<ChainId[]>([]).reset(unsubscribeFromAccounts);
const $initializedChainIds = createStore<ChainId[]>([]).reset(unsubscribeFromAccounts);

// Separate store for user-added callData (not mixed with on-chain data)
type UserCallDataEntry = {
  callData: CallData;
  transaction: DecodedTransaction;
};
type UserCallDataState = Record<ChainId, Record<AccountId, Record<HexString, UserCallDataEntry>>>;
const $userAddedCallData = createStore<UserCallDataState>({});

const $onChainOperations = combine(
  { operations: $onChainOperationsByCallhash, userCallData: $userAddedCallData },
  ({ operations, userCallData }) =>
    Object.values(operations)
      .flatMap(chainOperations =>
        Object.values(chainOperations).flatMap(accountOperations => Object.values(accountOperations)),
      )
      .filter(nonNullable)
      .map(op => {
        const userData = userCallData[op.chainId]?.[op.multisigAccountId]?.[op.callHash];
        if (userData) {
          return {
            ...op,
            callData: userData.callData,
            transaction: userData.transaction,
            method: userData.transaction.method,
            section: userData.transaction.section,
          };
        }
        return op;
      }),
);

const $initialOnChainFetched = combine(
  { expected: $chainIdsWithMultisigSupport, fetched: $initializedChainIds },
  ({ expected, fetched }) => {
    if (expected.length === 0) return false;
    return expected.every(chainId => fetched.includes(chainId));
  },
);

const $offChainFetched = createStore(false)
  .on(fetchOffchainResource.fetch.done, () => true)
  .reset(unsubscribeFromAccounts);

const $initialLoadingComplete = and($initialOnChainFetched, $offChainFetched);

sample({
  clock: $trackedCallHashes,
  source: {
    chains: networkModel.$chains,
  },
  fn: ({ chains }, state) => {
    return Object.values(state).flatMap(el => {
      const chain = chains[el.api.genesisHash.toHex()];
      if (!chain) return [];

      return [
        {
          api: el.api,
          hashes: el.hashes,
          chain,
        },
      ];
    });
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
  fn: ({ chains }) => keys(chains),
  target: $chainIdsWithMultisigSupport,
});

sample({
  clock: initialOnChainFetch.fetch.done,
  source: $initializedChainIds,
  fn: (fetched, { params }) => {
    const chainId = params.api.genesisHash.toHex();
    return [...new Set([...fetched, chainId])];
  },
  target: $initializedChainIds,
});

sample({
  clock: subscribeToAccounts,
  fn: ({ apis, accountIds, chains }) =>
    entries(apis).flatMap(([chainId, api]) => {
      const chain = chains[chainId];
      if (!chain) return [];

      return [
        {
          api,
          chain,
          accountIds,
        },
      ];
    }),
  target: series(initialOnChainFetch.fetch, { parallel: true }),
});

sample({
  clock: subscribeToAccounts,
  target: fetchOffchainResource.fetch,
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
    $userAddedCallData.reinit!,
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

// Clear stale cached operations that lack required fields (old format before multisigAccountId was added)
sample({
  clock: cachedOperationsLoaded,
  filter: ({ value }) => Array.isArray(value) && value.some(op => !op.multisigAccountId),
  fn: () => [],
  target: $cachedOperations,
});

const updateCallData = createEvent<{
  chainId: ChainId;
  multisigAccountId: AccountId;
  callHash: HexString;
  callData: CallData;
  transaction: DecodedTransaction;
}>();

$userAddedCallData.on(updateCallData, (state, { chainId, multisigAccountId, callHash, callData, transaction }) =>
  produce(state, draft => {
    if (!draft[chainId]) draft[chainId] = {};
    if (!draft[chainId][multisigAccountId]) draft[chainId][multisigAccountId] = {};
    draft[chainId][multisigAccountId][callHash] = { callData, transaction };
  }),
);

const $liveOperations = combine(
  {
    onChain: $onChainOperations,
    completedLiveOperations: $completedLiveOperations,
    offChain: $offChainOperations,
  },
  ({ onChain, completedLiveOperations, offChain }) => {
    // Merge: on-chain is authoritative for status/events but falls back to off-chain for
    // null method/section/callData (indexer has decoded these; on-chain fetch may return null).
    return multisigOperationService.mergeMultisigOperations(offChain, onChain.concat(completedLiveOperations));
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
    if (expectedChainIds.length === 0) {
      return cached;
    }

    const allFetched = expectedChainIds.every(chainId => fetchedChainIds.includes(chainId));
    if (allFetched) {
      return live;
    }

    // Hybrid: use live data for fetched chains, cached for others
    const liveByChain = groupBy(live, op => op.chainId);
    const cachedByChain = groupBy(cached, op => op.chainId);
    const allChainIds = [...new Set([...keys(liveByChain), ...keys(cachedByChain)])];

    const result: MultisigOperation[] = [];
    for (const chainId of allChainIds) {
      const ops = fetchedChainIds.includes(chainId) ? liveByChain[chainId] || [] : cachedByChain[chainId] || [];
      result.push(...ops);
    }

    return uniqBy(result, o => o.id);
  },
);

sample({
  clock: $liveOperations,
  source: {
    offChainFetched: $offChainFetched,
    fetchedChainIds: $initializedChainIds,
    cachedOperations: $cachedOperations,
  },
  filter: ({ offChainFetched, fetchedChainIds }) => offChainFetched && fetchedChainIds.length > 0,
  fn: ({ fetchedChainIds, cachedOperations }, liveOps) => {
    const liveByChain = groupBy(liveOps, op => op.chainId);
    const cachedByChain = groupBy(cachedOperations, op => op.chainId);
    const allChainIds = [...new Set([...keys(liveByChain), ...keys(cachedByChain)])];

    const result: MultisigOperation[] = [];
    for (const chainId of allChainIds) {
      const ops = fetchedChainIds.includes(chainId) ? liveByChain[chainId] || [] : cachedByChain[chainId] || [];
      result.push(...ops);
    }

    return uniqBy(result, o => o.id);
  },
  target: $cachedOperations,
});

// Cleanup operations when accounts are deleted
const deleteAccountIds = accounts.deleteAccounts.doneData.map(deleted => deleted.map(a => a.accountId));

$cachedOperations.on(deleteAccountIds, (ops, ids) => ops.filter(op => !ids.includes(op.multisigAccountId)));
$offChainOperations.on(deleteAccountIds, (ops, ids) => ops.filter(op => !ids.includes(op.multisigAccountId)));

$onChainOperationsByCallhash.on(deleteAccountIds, (state, ids) =>
  produce(state, draft => {
    for (const chainData of Object.values(draft)) {
      if (!chainData) continue;
      for (const accountId of keys(chainData)) {
        if (ids.includes(accountId)) delete chainData[accountId];
      }
    }
  }),
);

$trackedCallHashes.on(deleteAccountIds, (state, ids) =>
  produce(state, draft => {
    for (const chainData of Object.values(draft)) {
      if (!chainData) continue;
      for (const accountId of keys(chainData.hashes)) {
        if (ids.includes(accountId)) delete chainData.hashes[accountId];
      }
    }
  }),
);

// Evict cached operations whose multisigAccountId no longer matches a live
// multisig account. The explicit delete handler above only catches in-session
// deletions; this covers cross-session orphans (the cache outliving the owning
// wallet — e.g. wallet removed on another device or under an older build).
// Triggered both on account list updates and on initial cache hydration so
// whichever arrives second reconciles the other.
sample({
  clock: [accounts.$list, cachedOperationsLoaded],
  source: { cached: $cachedOperations, allAccounts: accounts.$list },
  fn: ({ cached, allAccounts }) => {
    if (cached.length === 0) return cached;

    // Domain `AnyAccount` doesn't declare `accountType` (shared/core's narrower
    // multisig types extend it). Runtime narrowing via the `in` operator keeps
    // us off explicit type casts.
    const live = new Set<string>();
    for (const account of allAccounts) {
      if (!('accountType' in account)) continue;
      const type = account.accountType;
      if (type === AccountType.MULTISIG) {
        live.add(account.accountId);
      } else if (type === AccountType.FLEX_MULTISIG && 'multisigAccountId' in account) {
        const inner = account.multisigAccountId;
        if (typeof inner === 'string') live.add(inner);
      }
    }

    const kept = cached.filter(op => live.has(op.multisigAccountId));
    // Same-reference return when nothing is evicted prevents a no-op write
    // from propagating through persist and downstream combines.
    return kept.length === cached.length ? cached : kept;
  },
  target: $cachedOperations,
});

export const multisigOperation = {
  $list: $allOperations,
  $populated: readonly($populated),
  $initialLoadingComplete,
  $onChainReady: readonly($initialOnChainFetched),
  $offChainReady: readonly($offChainFetched),
  $expectedChainIds: readonly($chainIdsWithMultisigSupport),
  $fetchedChainIds: readonly($initializedChainIds),

  subscribeToAccounts,
  unsubscribeFromAccounts,
  refetchOffchainOperations,
  updateCallData,

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
