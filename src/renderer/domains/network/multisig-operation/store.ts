import { type ApiPromise } from '@polkadot/api';
import { attach, combine, createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import { produce } from 'immer';
import { uniqBy } from 'lodash';
import { debug, once, readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { type Chain, type ChainId, type HexString } from '@/shared/core';
import { series } from '@/shared/effector';
import { entries, getNativeAssetId, nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { deriveFromResources } from '@/shared/resource';
import { networkModel } from '@/entities/network';
import { decodeCallData } from '@/entities/transaction';

import { deserializeOperation, serializeOperation } from './helpers';
import {
  fetchAllOperationsResource,
  fetchOffchainResource,
  initialOnChainFetch,
  subscribeEventsResource,
  subscribeOnChainEventsResource,
  subscribeOnchainResource,
} from './resource';
import { multisigOperationService } from './service';
import { type MultisigOperation } from './types';

// const $list = createStore<MultisigOperation[]>([]);

const subscribeToAccount = createEvent<{
  apis: Record<ChainId, ApiPromise>;
  accountId: AccountId;
  chains: Record<ChainId, Chain>;
}>();

const unsubscribeFromAccount = createEvent<AccountId>();

const $trackedCallHashes = createStore<Record<ChainId, { api: ApiPromise; hashes: Record<AccountId, HexString[]> }>>(
  {},
);

debug($trackedCallHashes);

const $offChainOperations = createStore<MultisigOperation[]>([]);
const $onChainData = createStore<Record<HexString, MultisigOperation | null>>({});
const $onChainOperations = $onChainData.map(state => Object.values(state).filter(nonNullable));

debug($onChainData);

const $allOperations = combine(
  {
    onChain: $onChainOperations,
    offChain: $offChainOperations,
  },
  state => {
    return uniqBy(state.onChain.concat(state.offChain), o => o.id);
  },
);

const $populated = restore(
  once($allOperations.updates).map(() => true),
  false,
);

const populateFx = createEffect(() =>
  storageService.multisigOperations.readAll().then(txs => txs.map(deserializeOperation)),
);

//not being used
// const addOperationsFx = createEffect(async (operations: MultisigOperation[]) => {
//   return storageService.multisigOperations
//     .createAll(operations.map(serializeOperation))
//     .then(result => result?.map(deserializeOperation) ?? []);
// });

const updateOperationsFx = createEffect((operations: MultisigOperation[]) => {
  return storageService.multisigOperations.updateAll(operations.map(serializeOperation)).then(() => operations);
});

// const removeTransactionsFx = createEffect((operations: MultisigOperation[]) => {
//   return storageService.multisigOperations.deleteAll(operations.map(t => t.id)).then(result => result ?? []);
// });

// /**
//  * We want to sync operations between database and in-memory store. Its
//  * important to do so because operations can be deleted from the database
//  * without calling removeTransactionsFx (f.e. in case of fork).
//  */
// const syncInMemoryOperationsToDbFx = createQueuedEffect(async (allOperations: MultisigOperation[]) => {
//   const dbOperations = await storageService.multisigOperations.readAll();
//   const dbOperationIds = dbOperations.map(op => op.id);

//   await storageService.multisigOperations.deleteAll(dbOperationIds);
//   await storageService.multisigOperations.insertAll(allOperations.map(serializeOperation));
// });

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

// not being used
// const removeOperationsForAccountFx = attach({
//   source: $list,
//   effect(operations, accountId: AccountId) {
//     const remove = scopeBind(removeTransactionsFx, { safe: true });
//     const operationsToRemove = operations.filter(o => o.accountId === accountId);
//     return remove(operationsToRemove);
//   },
// });

// const operationChanges = pairwise($list)
//   .map(({ prev: prevState, current: update }) => {
//     const previousOpsMap = new Map(prevState.map(op => [getOperationId(op), op]));
//     const currentOpsMap = new Map(update.map(op => [getOperationId(op), op]));

//     const added: MultisigOperation[] = [];
//     const removedKeys: string[] = [];

//     for (const item of update) {
//       const previousOp = previousOpsMap.get(getOperationId(item));

//       if (!previousOp) {
//         added.push(item);
//       } else if (previousOp.status !== item.status && item.status !== 'pending') {
//         added.push(item);
//       }
//     }

//     for (const prevOp of prevState) {
//       if (!currentOpsMap.has(getOperationId(prevOp))) {
//         removedKeys.push(getNotificationKey(prevOp));
//       }
//     }

//     return { added, removedKeys };
//   })
//   .filter({ fn: ({ added, removedKeys }) => added.length > 0 || removedKeys.length > 0 });

// sample({
//   clock: operationChanges,
//   source: { populated: $populated, accountsList: accounts.$list },
//   filter: ({ populated }) => populated,
//   fn: ({ accountsList }, { added, removedKeys }) => {
//     const accountsMap = new Map<AccountId, AnyAccount>(accountsList.map(account => [account.accountId, account]));

//     const notificationsToAdd = added
//       .filter(operation => {
//         const account = accountsMap.get(operation.accountId);

//         return !account?.createdAt || operation.timestamp >= account.createdAt;
//       })
//       .map(operation => {
//         const account = accountsMap.get(operation.accountId);

//         return createOperationNotification(operation, account?.name);
//       });

//     return {
//       added: notificationsToAdd,
//       removed: { keys: removedKeys },
//     };
//   },
//   target: spread({
//     added: notificationModel.events.notificationsAdded,
//     removed: notificationModel.events.notificationsRemoved,
//   }),
// });

deriveFromResources({
  store: $offChainOperations,
  resources: [fetchOffchainResource],
  map(state, operations, { accountId }) {
    const operationWithoutGivenAccount = state.filter(o => o.accountId !== accountId);
    return multisigOperationService.mergeMultisigOperations(operationWithoutGivenAccount, operations);
  },
});

deriveFromResources({
  store: $onChainData,
  resources: [initialOnChainFetch],
  map(state, { onChainData }) {
    return { ...state, ...onChainData };
  },
});

deriveFromResources({
  store: $trackedCallHashes,
  resources: [initialOnChainFetch],
  map(state, { callHashesByChain }, { apis, accountId }) {
    return produce(state, draft => {
      for (const [chainId, api] of entries(apis)) {
        const existing = draft[chainId] || { api, hashes: {} };
        const newHashes = callHashesByChain[chainId] ?? [];

        const newHashesMap = { ...existing.hashes };
        newHashesMap[accountId] = newHashes;

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

sample({
  clock: subscribeOnchainResource.push,
  source: $onChainData,
  fn: (state, clockData) =>
    produce(state, draft => {
      Object.assign(draft, clockData.result);
    }),
  target: $onChainData,
});

sample({
  clock: subscribeOnChainEventsResource.push,
  source: $trackedCallHashes,
  fn: (state, { params, result }) =>
    produce(state, draft => {
      draft[params.api.genesisHash.toHex()]?.hashes[params.accountId]?.push(result);
    }),
  target: $trackedCallHashes,
});

// deriveFromResources({
//   store: $onChainOperations,
//   resources: [fetchOnchainResource, subscribeResource],
//   map(state, operations) {
//     return multisigOperationService.mergeMultisigOperations(state, operations);
//   },
// });

//important place to solve changes from
// deriveFromResources({
//   store: $mafuckaList,
//   resources: [subscribeEventsResource],
//   map: (state, { chainId, operationId, event }) => {
//     const operationIndex = state.findIndex(x => x.id === operationId && x.chainId === chainId);
//     const operation = state[operationIndex];

//     if (operationIndex === -1 || !operation) return state;

//     const updatedOperation = {
//       ...operation,
//       status: event.status === 'reject' ? 'cancelled' : operation.status,
//       events: multisigOperationService.mergeEvents(operation.events, [event]),
//     };

//     return multisigOperationService.mergeMultisigOperations(state, [updatedOperation]);
//   },
// });

// sample({
//   clock: populateFx.doneData,
//   target: $list,
// });

//need to find a workaround (derived store should not be used as a target)
// sample({
//   clock: addOperationsFx.doneData,
//   source: $list,
//   fn: multisigOperationService.mergeMultisigOperations,
//   target: $list,
// });

//need to find a workaround (derived store should not be used as a target)
// sample({
//   clock: updateOperationsFx.doneData,
//   source: $mafuckaList,
//   fn: multisigOperationService.mergeMultisigOperations,
//   target: $mafuckaList,
// });

//need to find a workaround (derived store should not be used as a target)
// sample({
//   clock: removeTransactionsFx.doneData,
//   source: $list,
//   fn(list, removedIds) {
//     return list.filter(l => !removedIds.includes(l.id));
//   },
//   target: $list,
// });

// sample({
//   clock: $list,
//   filter: list => list.length > 0,
//   target: syncInMemoryOperationsToDbFx,
// });

sample({
  clock: subscribeToAccount,
  target: [initialOnChainFetch.request, fetchOffchainResource.request],
});

sample({
  clock: subscribeToAccount,
  fn: ({ accountId, apis }) => Object.values(apis).map(api => ({ api, accountId })),
  target: series(subscribeOnChainEventsResource.subscribe, { parallel: true }),
});

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

  //API
  subscribeToAccount,
  unsubscribeFromAccount,
  requestAllOperations: fetchAllOperationsResource.request,

  populate: populateFx,
  // addOperations: addOperationsFx,
  updateOperations: updateOperationsFx,
  // removeOperationsForAccount: removeOperationsForAccountFx,
  updateCallData: updateCallDataFx,
  // requestOnchainOperations: fetchOnchainResource.request,
  requestOffchainOperations: fetchOffchainResource.request,
  initialOnChainFetch: initialOnChainFetch.request,
  subscribe: subscribeOnchainResource.subscribe,
  unsubscribe: subscribeOnchainResource.unsubscribe,
  subscribeEvents: subscribeEventsResource.subscribe,
  unsubscribeEvents: subscribeEventsResource.unsubscribe,

  __test: {
    $list: $allOperations,
    $populated,
  },
};
