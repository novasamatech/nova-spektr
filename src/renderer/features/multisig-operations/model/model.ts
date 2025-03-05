import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { readonly, spread } from 'patronum';

import { storageService } from '@/shared/api/storage';
// eslint-disable-next-line boundaries/element-types
import { type HexString } from '@/shared/core';
import { merge } from '@/shared/lib/utils';
import { type MultisigOperation, type OperationData, operations } from '@/domains/multisig';
import { networkModel } from '@/entities/network';
import { getDataFromCallData } from '@/entities/transaction';
import { walletSelect } from '@/aggregates/wallet-select';
import { submitModel } from '@/features/operations/OperationSubmit';

import { multisigOperationsFeatureStatus } from './status';

const changeFilteredTxs = createEvent<MultisigOperation[]>();

const $list = createStore<MultisigOperation[]>([]);

const populateFx = createEffect(() => storageService.multisigOperations.readAll());

const addTransactionsFx = createEffect(
  async (transactions: Omit<MultisigOperation, 'id'>[]): Promise<MultisigOperation[]> => {
    return storageService.multisigOperations.createAll(transactions).then(result => result ?? []);
  },
);

const updateTransactionsFx = createEffect((transactions: MultisigOperation[]): Promise<number[]> => {
  return storageService.multisigOperations.updateAll(transactions).then(result => result ?? []);
});

const removeTransactionsFx = createEffect((transactions: MultisigOperation[]): Promise<string[] | undefined> => {
  return storageService.multisigOperations.deleteAll(transactions.map(t => t.id)).then(result => result ?? []);
});

const updateCallDataFx = createEffect(
  ({ api, tx, callData }: { api: ApiPromise; tx: MultisigOperation; callData: HexString }): MultisigOperation => {
    const { decoded } = getDataFromCallData(api, callData);

    return {
      ...tx,
      ...(decoded.method.toHuman() as OperationData),
    };
  },
);

const $all = combine(
  {
    accounts: walletSelect.$selectedAccounts,
    operations: $list,
    chains: networkModel.$chains,
  },
  ({ accounts, operations, chains }) => {
    return operations.filter(tx => accounts.find(a => a.accountId === tx.accountId) && tx.chainId in chains);
  },
);

const $filteredTxs = restore<MultisigOperation[]>(changeFilteredTxs, []).reset($all);

sample({
  clock: multisigOperationsFeatureStatus.running,
  target: [operations.requestOperations, operations.subscribe, populateFx],
});

sample({
  clock: multisigOperationsFeatureStatus.stopped,
  target: operations.unsubscribe,
});

sample({
  clock: populateFx.doneData,
  target: $list,
});

sample({
  clock: addTransactionsFx,
  target: populateFx,
});

sample({
  clock: updateTransactionsFx,
  target: populateFx,
});

sample({
  clock: removeTransactionsFx,
  target: populateFx,
});

sample({
  clock: operations.$operations,
  source: $list,
  fn(list, updatedList) {
    const toUpdate = [];
    const toAdd = [];

    for (const tx of Object.values(updatedList).flat()) {
      if (list.find(t => t.id === tx.id)) {
        toUpdate.push(tx);
      } else {
        toAdd.push(tx);
      }
    }

    return {
      toUpdate,
      toAdd,
    };
  },
  target: spread({
    toAdd: addTransactionsFx,
    toUpdate: updateTransactionsFx,
  }),
});

sample({
  clock: operations.$operations,
  source: $list,
  fn(list, updatedList) {
    return merge({
      a: list,
      b: Object.values(updatedList).flat(),
      mergeBy: a => [a.chainId, a.accountId, a.blockCreated, a.indexCreated, a.callHash],
      sort: (a, b) => b.blockCreated - a.blockCreated,
    });
  },
  target: $list,
});

sample({
  clock: updateCallDataFx.doneData,
  source: $list,
  fn(list, updatedTx) {
    return merge({
      a: list,
      b: [updatedTx],
      mergeBy: a => [a.chainId, a.accountId, a.blockCreated, a.indexCreated, a.callHash],
      sort: (a, b) => b.blockCreated - a.blockCreated,
    });
  },
  target: $list,
});

sample({
  clock: updateCallDataFx.doneData,
  fn(updatedTx) {
    return [updatedTx];
  },
  target: updateTransactionsFx,
});

sample({
  clock: submitModel.output.saveMultisigTx,
  target: addTransactionsFx,
});

export const multisigOperations = {
  $list: readonly($list),
  $all,
  $pending: multisigOperationsFeatureStatus.isStarting,
  $fulfilled: multisigOperationsFeatureStatus.isRunning,
  $filteredTxs,

  changeFilteredTxs,
  populate: populateFx,
  addTransactions: addTransactionsFx,
  updateTransactions: updateTransactionsFx,
  removeTransactions: removeTransactionsFx,
  updateCallData: updateCallDataFx,
};
