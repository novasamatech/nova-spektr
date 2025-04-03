import { createEvent, restore, sample } from 'effector';
import groupBy from 'lodash/groupBy';

import { sortByDateDesc } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigOperation, multisigOperations } from '@/domains/network';
import { accountMultisigOperations } from '@/aggregates/account-multisig-operations';
import { submitModel } from '@/features/operations/OperationSubmit';

import { multisigOperationsFeature } from './feature';

const changeFilteredTxs = createEvent<MultisigOperation[]>();
const removeAccountTransactions = createEvent<AccountId>();

const $filteredTxs = restore(changeFilteredTxs, []).reset(accountMultisigOperations.$accountOperations);

const $groupedTxs = $filteredTxs.map(filteredTxs => {
  const sortedTxs = Array.from(filteredTxs).sort((a, b) => b.timestamp - a.timestamp);
  const groups = groupBy(sortedTxs, tx => new Date(tx.timestamp).toUTCString());
  return Object.entries(groups).sort(sortByDateDesc);
});

sample({
  clock: multisigOperationsFeature.running,
  target: [multisigOperations.subscribe, multisigOperations.subscribeEvents],
});

sample({
  clock: multisigOperationsFeature.stopped,
  target: [multisigOperations.unsubscribe, multisigOperations.unsubscribeEvents],
});

sample({
  clock: submitModel.output.saveMultisigTx,
  target: multisigOperations.addTransactions,
});

sample({
  clock: removeAccountTransactions,
  source: multisigOperations.$list,
  fn(txs, accountId) {
    return txs.filter(tx => tx.accountId === accountId);
  },
  target: multisigOperations.removeTransactions,
});

export const list = {
  $pending: multisigOperationsFeature.isStarting,
  $fulfilled: multisigOperationsFeature.isRunning,
  $filteredTxs,
  $groupedTxs,

  changeFilteredTxs,
  removeAccountTransactions,
};
