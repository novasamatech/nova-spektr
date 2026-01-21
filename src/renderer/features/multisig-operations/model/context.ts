import { endOfDay, isAfter, isWithinInterval, startOfDay } from 'date-fns';
import { combine, createEvent, restore, sample } from 'effector';
import { interval, throttle } from 'patronum';
import { type DateRange } from 'react-day-picker';

import { TransactionType } from '@/shared/core';
import { type AnyAccount, type MultisigOperation, accountService, multisigOperation } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { TransferTypes, XcmTypes, findCoreBatchAll } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { walletSelect } from '@/aggregates/wallet-select';

import { multisigOperationsFeature } from './feature';

interface SelectedFilters {
  network: string[];
  type: string[];
  dateRange?: DateRange;
}
export type TabFilter = 'pending' | 'history';

const filterTx = (tx: MultisigOperation, filters: SelectedFilters, tab: TabFilter) => {
  const xcmDestination = tx.transaction?.args.destinationChain;

  const hasOrigin = !filters.network.length || filters.network.includes(tx.chainId);
  const hasDestination = !filters.network.length || filters.network.includes(xcmDestination);
  const hasTxType = !filters.type.length || filters.type.includes(getFilterableTxType(tx));

  let isInDateRange = true;
  if (filters.dateRange) {
    const { from, to } = filters.dateRange;

    if (from || to) {
      const txDate = new Date(tx.timestamp);

      if (from && to) {
        isInDateRange = isWithinInterval(txDate, { start: startOfDay(from), end: endOfDay(to) });
      } else if (from) {
        isInDateRange = isAfter(txDate, startOfDay(from)) || txDate.getTime() === startOfDay(from).getTime();
      }
    }
  }

  const statusMatchesTab =
    tab === 'pending' ? tx.status === 'pending' : ['executed', 'cancelled', 'error'].includes(tx.status);

  return (hasOrigin || hasDestination) && hasTxType && isInDateRange && statusMatchesTab;
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
const setTab = createEvent<TabFilter>();

const $filter = restore(setFilters, {
  network: [],
  type: [],
  dateRange: undefined,
}).reset(resetFilters);

const $tab = restore(setTab, 'pending');

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
  accs => accs.find(a => accountUtils.isAnyMultisigAccount(a)) ?? null,
);

const $initiator = $initiators.map(initiators => initiators.at(0) ?? null);

const $filteredOperations = combine(
  { operations: selectedWalletMultisigOperations.$list, filter: $filter, tab: $tab },
  ({ operations, filter, tab }) => {
    return operations.filter(op => filterTx(op, filter, tab));
  },
);

const $isTabDataLoading = combine(
  { tab: $tab, onChainReady: multisigOperation.$onChainReady, offChainReady: multisigOperation.$offChainReady },
  ({ tab, onChainReady, offChainReady }) => {
    return tab === 'pending' ? !onChainReady : !offChainReady;
  },
);

sample({
  // TODO: costil' around dynamic array of apis
  clock: multisigOperationsFeature.running,
  filter: ({ accountIds, apis }) => accountIds.length > 0 && Object.keys(apis).length > 0,
  fn: ({ accountIds, apis, chains }) => ({ accountIds, apis, chains }),
  target: multisigOperation.subscribeToAccounts,
});

sample({
  clock: throttle(multisigOperationsFeature.stopped, 500),
  target: multisigOperation.unsubscribeFromAccounts,
});

const { tick } = interval({
  start: multisigOperationsFeature.running,
  stop: multisigOperationsFeature.stopped,
  timeout: 30000,
});

sample({
  clock: tick,
  target: multisigOperation.refetchOffchainOperations,
});

export const operationsContextModel = {
  $filter,
  $filteredOperations,
  $multisigAccount,
  $initiator,
  $tab,
  $isTabDataLoading,

  setFilters,
  resetFilters,
  setTab,
};
