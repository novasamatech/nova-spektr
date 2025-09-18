import { combine, createEvent, restore, sample } from 'effector';

import { TransactionType } from '@/shared/core';
import { type AnyAccount, type MultisigOperation, accountService, multisigOperation } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { TransferTypes, XcmTypes, findCoreBatchAll } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { walletSelect } from '@/aggregates/wallet-select';

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

const $initiators = combine(
  { accounts: walletSelect.$selectedAccounts, chains: networkModel.$chains },
  ({ accounts, chains }) => {
    if (accounts.length === 0) return [];

    const initiators = new Map<string, AnyAccount>();

    for (const chain of Object.values(chains)) {
      if (!networkUtils.isMultisigSupported(chain.options)) continue;

      const chainInitiators = accountService.findInitiators(accounts, chain);
      for (const initiator of chainInitiators) {
        initiators.set(initiator.accountId, initiator);
      }
    }

    return Array.from(initiators.values());
  },
);

const $multisigAccount = walletSelect.$selectedAccounts.map(
  accs => accs.find(a => accountUtils.isMultisigAccount(a) || accountUtils.isFlexibleMultisigAccount(a)) ?? null,
);

const $initiator = $initiators.map(initiators => initiators.at(0) ?? null);

const $filteredOperations = combine(
  { operations: selectedWalletMultisigOperations.$list, filter: $filter },
  ({ operations, filter }) => {
    return operations.filter(op => filterTx(op, filter));
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

export const operationsContextModel = {
  $filter,
  $filteredOperations,
  $multisigAccount,
  $initiator,

  setFilters,
  resetFilters,
};
