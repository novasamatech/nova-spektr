import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { isEqual } from 'lodash';
import { readonly, spread } from 'patronum';

import { storageService } from '@/shared/api/storage';
// eslint-disable-next-line boundaries/element-types
import { type HexString, type NoID } from '@/shared/core';
import { series } from '@/shared/effector';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type MultisigOperation,
  type MultisigOperationDB,
  type MultisigOperationData,
  multisigOperations,
} from '@/domains/network';
import { networkModel } from '@/entities/network';
import { getDataFromCallData } from '@/entities/transaction';
import { walletSelect } from '@/aggregates/wallet-select';
import { submitModel } from '@/features/operations/OperationSubmit';

import { multisigOperationsFeatureStatus } from './status';

const transformDepositToString = <T extends NoID<MultisigOperation>>(
  tx: T,
): Omit<T, 'deposit'> & { deposit?: string } => {
  return {
    ...tx,
    deposit: tx.deposit?.toString(),
  };
};

const transformDepositToBN = (tx: MultisigOperationDB): MultisigOperation => {
  return {
    ...tx,
    deposit: tx.deposit ? new BN(tx.deposit) : undefined,
  };
};

const changeFilteredTxs = createEvent<MultisigOperation[]>();
const removeAccountTransactions = createEvent<AccountId>();

const $list = createStore<MultisigOperation[]>([]);

const populateFx = createEffect(() =>
  storageService.multisigOperations.readAll().then(txs => txs.map(transformDepositToBN)),
);

const addTransactionsFx = createEffect(
  async (transactions: NoID<MultisigOperation>[]): Promise<MultisigOperation[]> => {
    return storageService.multisigOperations
      .createAll(transactions.map(transformDepositToString))
      .then(result => result?.map(transformDepositToBN) ?? []);
  },
);

const updateTransactionsFx = createEffect((transactions: MultisigOperation[]): Promise<number[]> => {
  return storageService.multisigOperations
    .updateAll(transactions.map(transformDepositToString))
    .then(result => result ?? []);
});

const removeTransactionsFx = createEffect((transactions: MultisigOperation[]): Promise<string[] | undefined> => {
  return storageService.multisigOperations.deleteAll(transactions.map(t => t.id)).then(result => result ?? []);
});

const updateCallDataFx = createEffect(
  ({ api, tx, callData }: { api: ApiPromise; tx: MultisigOperation; callData: HexString }): MultisigOperation => {
    const { decoded } = getDataFromCallData(api, callData);

    return {
      ...tx,
      ...(decoded.method.toHuman() as MultisigOperationData),
    };
  },
);

const $availableOperations = combine(
  {
    accounts: walletSelect.$selectedAccounts,
    operations: $list,
    chains: networkModel.$chains,
  },
  ({ accounts, operations, chains }) => {
    return operations.filter(tx => accounts.find(a => a.accountId === tx.accountId) && tx.chainId in chains);
  },
);

const $filteredTxs = restore<MultisigOperation[]>(changeFilteredTxs, []).reset($availableOperations);

sample({
  clock: multisigOperationsFeatureStatus.running,
  target: series(multisigOperations.requestOperations),
});

sample({
  clock: multisigOperationsFeatureStatus.running,
  target: [multisigOperations.subscribeIndexer, multisigOperations.subscribeEvents, populateFx],
});

sample({
  clock: multisigOperationsFeatureStatus.stopped,
  target: [multisigOperations.unsubscribeIndexer, multisigOperations.unsubscribeEvents],
});

sample({
  clock: populateFx.doneData,
  target: $list,
});

sample({
  clock: addTransactionsFx.doneData,
  target: populateFx,
});

sample({
  clock: updateTransactionsFx.doneData,
  target: populateFx,
});

sample({
  clock: removeTransactionsFx.doneData,
  target: populateFx,
});

sample({
  clock: multisigOperations.$list,
  source: $list,
  fn(list, updatedList) {
    const toUpdate = [];
    const toAdd = [];

    for (const tx of Object.values(updatedList).flat()) {
      const foundTx = list.find(t => t.id === tx.id);
      if (foundTx) {
        if (!isEqual(foundTx, tx)) {
          toUpdate.push(tx);
        }
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

sample({
  clock: removeAccountTransactions,
  source: $list,
  fn(txs, accountId) {
    return txs.filter(tx => tx.accountId === accountId);
  },
  target: removeTransactionsFx,
});

export const operations = {
  $list: readonly($list),
  $availableOperations,
  $pending: multisigOperationsFeatureStatus.isStarting,
  $fulfilled: multisigOperationsFeatureStatus.isRunning,
  $filteredTxs,

  changeFilteredTxs,
  populate: populateFx,
  addTransactions: addTransactionsFx,
  updateTransactions: updateTransactionsFx,
  removeTransactions: removeTransactionsFx,
  removeAccountTransactions,
  updateCallData: updateCallDataFx,
};
