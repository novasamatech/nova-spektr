import { createEvent, restore, sample } from 'effector';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigOperation, multisigOperations } from '@/domains/network';
import { accountMultisigOperations } from '@/aggregates/account-multisig-operations';
import { submitModel } from '@/features/operations/OperationSubmit';

import { multisigOperationsFeature } from './feature';

const changeFilteredTxs = createEvent<MultisigOperation[]>();
const removeAccountTransactions = createEvent<AccountId>();

const $filteredTxs = restore(changeFilteredTxs, []).reset(accountMultisigOperations.$accountOperations);

// sample({
//   clock: multisigOperationsFeature.running,
//   target: series(multisigOperations.requestOperations),
// });

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

export const operations = {
  $pending: multisigOperationsFeature.isStarting,
  $fulfilled: multisigOperationsFeature.isRunning,
  $filteredTxs,

  changeFilteredTxs,
  removeAccountTransactions,
};
