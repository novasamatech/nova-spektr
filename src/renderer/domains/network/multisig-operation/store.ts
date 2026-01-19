import { type ApiPromise } from '@polkadot/api';
import { attach, combine, createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import { produce } from 'immer';
import { uniqBy } from 'lodash';
import { interval, once, readonly, spread } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { type Chain, type ChainId, type HexString, NotificationType } from '@/shared/core';
import { pairwise, series } from '@/shared/effector';
import { entries, getNativeAssetId, groupBy, keys, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type ResourceRequestKey } from '@/shared/query/types';
import { deriveFromResources } from '@/shared/resource';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { decodeCallData } from '@/entities/transaction';
import { accounts } from '../account/store';

import { deserializeOperation, serializeOperation } from './helpers';
import {
  fetchAllOperationsResource,
  fetchOffchainResource,
  initialOnChainFetch,
  subscribeEventsResource,
  subscribeNewMultisigEventsResource,
  subscribeOnchainResource,
} from './resource';
import { multisigOperationService } from './service';
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

const $offChainOperations = createStore<MultisigOperation[]>([]);
const $onChainOperationsByCallhash = createStore<Record<HexString, MultisigOperation | null>>({});
const $onChainOperations = $onChainOperationsByCallhash.map(state => Object.values(state).filter(nonNullable));

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

deriveFromResources({
  store: $offChainOperations,
  resources: [fetchOffchainResource],
  map(state, operations, { accountIds }) {
    const operationWithoutGivenAccounts = state.filter(o => !accountIds.includes(o.accountId));
    return multisigOperationService.mergeMultisigOperations(operationWithoutGivenAccounts, operations);
  },
});

deriveFromResources({
  store: $onChainOperationsByCallhash,
  resources: [initialOnChainFetch],
  map(state, { onChainData }) {
    return { ...state, ...onChainData };
  },
});

deriveFromResources({
  store: $trackedCallHashes,
  resources: [initialOnChainFetch],
  map(state, { callHashesByChain }, { apis, accountIds }) {
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
  target: [initialOnChainFetch.request, fetchOffchainResource.request],
});

const { tick } = interval({
  start: subscribeToAccounts,
  stop: unsubscribeFromAccounts,
  timeout: 30000,
});

sample({
  clock: tick,
  source: {
    apis: $subscribedApis,
    accountIds: $subscribedAccounts,
    chains: networkModel.$chains,
  },
  filter: ({ accountIds }) => accountIds.length > 0,
  target: fetchOffchainResource.request,
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
  target: fetchOffchainResource.request,
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

      const newEvents = op.events.concat(events.map(e => e.event));
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

const getOperationId = (op: MultisigOperation) =>
  multisigOperationService.getOperationId(op.chainId, op.callHash, op.accountId, op.blockCreated, op.indexCreated);

const getNotificationKey = (op: MultisigOperation) =>
  `${NotificationType.MULTISIG_OPERATION}-${getOperationId(op)}-${op.status}`;

const operationChanges = pairwise($allOperations)
  .map(({ prev: prevState, current: update }) => {
    const previousOpsMap = new Map(prevState.map(op => [getOperationId(op), op]));
    const currentOpsMap = new Map(update.map(op => [getOperationId(op), op]));

    const added: MultisigOperation[] = [];
    const removedKeys: string[] = [];

    for (const item of update) {
      const previousOp = previousOpsMap.get(getOperationId(item));

      if (!previousOp) {
        added.push(item);
      } else if (previousOp.status !== item.status && item.status !== 'pending') {
        added.push(item);
      }
    }

    for (const prevOp of prevState) {
      if (!currentOpsMap.has(getOperationId(prevOp))) {
        removedKeys.push(getNotificationKey(prevOp));
      }
    }

    return { added, removedKeys };
  })
  .filter({ fn: ({ added, removedKeys }) => added.length > 0 || removedKeys.length > 0 });

sample({
  clock: operationChanges,
  source: { populated: $populated, accountsList: accounts.$list },
  filter: ({ populated }) => populated,
  fn: ({ accountsList }, { added, removedKeys }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accountsMap = new Map<AccountId, any>(accountsList.map(account => [account.accountId, account]));

    const notificationsToAdd = added
      .filter(operation => {
        const account = accountsMap.get(operation.accountId);

        return !account?.createdAt || operation.timestamp >= account.createdAt;
      })
      .map(operation => {
        const account = accountsMap.get(operation.accountId);

        return multisigOperationService.createOperationNotification(operation, account?.name);
      });

    return {
      added: notificationsToAdd,
      removed: { keys: removedKeys },
    };
  },
  target: spread({
    added: notificationModel.events.notificationsAdded,
    removed: notificationModel.events.notificationsRemoved,
  }),
});

export const multisigOperation = {
  $list: $allOperations,
  $populated: readonly($populated),
  $callDataUpdated,

  //API
  subscribeToAccounts,
  unsubscribeFromAccounts,
  requestAllOperations: fetchAllOperationsResource.request,

  populate: populateFx,
  updateOperations: updateOperationsFx,
  updateCallData: updateCallDataFx,
  requestOffchainOperations: fetchOffchainResource.request,
  initialOnChainFetch: initialOnChainFetch.request,

  __test: {
    $list: $offChainOperations,
    $populated,
  },
};
