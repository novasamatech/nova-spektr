import { combine, createEvent, restore, sample } from 'effector';

import { TransactionType } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type MultisigOperation, multisigOperation } from '@/domains/network';
import { TransferTypes, XcmTypes, findCoreBatchAll, isCreatePureProxyTransaction } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { submitModel } from '@/features/operations/OperationSubmit';

import { multisigOperationsFeature } from './feature';

type FilterName = 'status' | 'network' | 'type';
type SelectedFilters = Record<FilterName, string[]>;

const filterTx = (tx: MultisigOperation, filters: SelectedFilters) => {
  const xcmDestination = tx.transaction?.args.destinationChain;

  const hasStatus = !filters.status.length || filters.status.includes(tx.status);
  const hasOrigin = !filters.network.length || filters.network.includes(tx.chainId);
  const hasDestination = !filters.network.length || filters.network.includes(xcmDestination);
  const hasTxType = !filters.type.length || filters.type.includes(getFilterableTxType(tx));

  return hasStatus && (hasOrigin || hasDestination) && hasTxType;
};

const getFilterableTxType = (op: MultisigOperation): TransactionType | 'UNKNOWN_TYPE' => {
  if (!op.transaction?.type) {
    return 'UNKNOWN_TYPE';
  }

  if (TransferTypes.includes(op.transaction.type)) {
    return TransactionType.TRANSFER;
  }
  if (XcmTypes.includes(op.transaction.type)) {
    return TransactionType.XCM_LIMITED_TRANSFER;
  }

  if (op.transaction.type === TransactionType.BATCH_ALL) {
    const txMatch = findCoreBatchAll(op.transaction);

    return txMatch?.type || 'UNKNOWN_TYPE';
  }

  return op.transaction.type;
};

const setFilters = createEvent<SelectedFilters>();
const resetFilters = createEvent();

const $filter = restore(setFilters, {
  status: [],
  network: [],
  type: [],
}).reset(resetFilters);

const $filteredOperations = combine(selectedWalletMultisigOperations.$list, $filter, (ops, filter) => {
  return ops.filter(op => filterTx(op, filter));
});

const $account = walletSelect.$selectedAccounts.map(x => x.find(accountUtils.isMultisigAccount) ?? null);

const $incompleteFlexibleMultisigTx = combine(
  { account: $account, wallet: walletSelect.$selectedWallet, txs: selectedWalletMultisigOperations.$list },
  ({ account, wallet, txs }) => {
    const signingTransactions = txs.filter(tx => tx.status === 'pending');

    if (
      nonNullable(account) &&
      walletUtils.isFlexibleMultisig(wallet) &&
      !wallet.activated &&
      signingTransactions.length === 1
    ) {
      return signingTransactions.find(tx => isCreatePureProxyTransaction(tx.transaction)) ?? null;
    }

    return null;
  },
);

sample({
  clock: multisigOperationsFeature.running,
  target: [multisigOperation.subscribe, multisigOperation.subscribeEvents],
});

sample({
  clock: multisigOperationsFeature.stopped,
  target: [multisigOperation.unsubscribe, multisigOperation.unsubscribeEvents],
});

sample({
  clock: submitModel.output.saveMultisigTx,
  target: multisigOperation.addOperations,
});

export const operationsContextModel = {
  $filter,
  $filteredOperations,
  $account,
  $incompleteFlexibleMultisigTx,

  setFilters,
  resetFilters,
};
