import { endOfDay, isAfter, isWithinInterval, startOfDay } from 'date-fns';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { produce } from 'immer';
import { interval, throttle } from 'patronum';
import { type DateRange } from 'react-day-picker';

import { type Done, persist } from '@/shared/api/storage';
import {
  type ChainId,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type ProxyType,
  TransactionType,
} from '@/shared/core';
import { nonNullable, toAddress } from '@/shared/lib/utils';
import {
  type AnyAccount,
  type MultisigOperation,
  accountService,
  accounts,
  multisigOperation,
} from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { TransferTypes, XcmTypes, findCoreBatchAll } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { multisigService } from '@/features/multisig-wallet';

import { deepLinkModel } from './deep-link';
import { multisigOperationsFeature } from './feature';

interface SelectedFilters {
  account: string[];
  network: string[];
  type: string[];
  proxyType: string[];
  dateRange?: DateRange;
  searchQuery: string;
}
export type TabFilter = 'pending' | 'history' | 'hidden';

const $hiddenOperationIds = createStore<string[]>([]);
const hiddenOperationsLoaded = createEvent<Done<string[]>>();
persist({ store: $hiddenOperationIds, key: 'hidden-multisig-operations', done: hiddenOperationsLoaded });

const hideOperation = createEvent<string>();
const unhideOperation = createEvent<string>();

$hiddenOperationIds
  .on(hideOperation, (state, id) => (state.includes(id) ? state : [...state, id]))
  .on(unhideOperation, (state, id) => state.filter(opId => opId !== id));

const filterTx = (
  tx: MultisigOperation,
  filters: SelectedFilters,
  tab: TabFilter,
  hiddenIds: string[],
  multisigAccountsMap: Record<string, MultisigAccount | FlexibleMultisigAccount>,
  walletNameByAccountId: Record<string, string>,
  chains: Record<string, { addressPrefix?: number }>,
) => {
  const isHidden = hiddenIds.includes(tx.id);

  if (tab === 'hidden') {
    if (!isHidden) return false;
  } else {
    if (isHidden) return false;
  }

  const xcmDestination = tx.transaction?.args.destinationChain;

  const hasAccount = !filters.account.length || filters.account.includes(tx.accountId);
  const hasOrigin = !filters.network.length || filters.network.includes(tx.chainId);
  const hasDestination = !filters.network.length || filters.network.includes(xcmDestination);
  const hasTxType = !filters.type.length || filters.type.includes(getFilterableTxType(tx));

  const multisigAccount = multisigAccountsMap[tx.accountId];
  let operationProxyType: ProxyType | null = null;

  if (multisigAccount && accountUtils.isFlexibleMultisigAccount(multisigAccount)) {
    operationProxyType = multisigAccount.proxyType;
  }

  const hasProxyType =
    !filters.proxyType.length || (nonNullable(operationProxyType) && filters.proxyType.includes(operationProxyType));

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
    tab === 'hidden'
      ? true
      : tab === 'pending'
        ? tx.status === 'pending'
        : ['executed', 'cancelled', 'error'].includes(tx.status);

  const searchQuery = filters.searchQuery?.trim().toLowerCase();
  const walletName = (walletNameByAccountId[tx.accountId] ?? '').toLowerCase();
  const accountAddress = toAddress(tx.accountId, { prefix: chains[tx.chainId]?.addressPrefix }).toLowerCase();
  const matchesSearch =
    !searchQuery ||
    walletName.includes(searchQuery) ||
    accountAddress.includes(searchQuery) ||
    tx.callHash.toLowerCase().includes(searchQuery);

  return (
    hasAccount &&
    (hasOrigin || hasDestination) &&
    hasTxType &&
    hasProxyType &&
    isInDateRange &&
    statusMatchesTab &&
    matchesSearch
  );
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

const initialFilter: SelectedFilters = {
  account: [],
  network: [],
  type: [],
  proxyType: [],
  dateRange: undefined,
  searchQuery: '',
};

const setFilter = createEvent<Partial<SelectedFilters>>();
const resetFilters = createEvent();
const setTab = createEvent<TabFilter>();

const $filter = createStore(initialFilter)
  .on(setFilter, (state, partial) =>
    produce(state, draft => {
      Object.assign(draft, partial);
    }),
  )
  .reset(resetFilters);

const $isFiltersSelected = $filter.map(filter =>
  Boolean(
    filter.account.length ||
      filter.network.length ||
      filter.type.length ||
      filter.proxyType.length ||
      filter.dateRange?.from ||
      filter.dateRange?.to ||
      filter.searchQuery,
  ),
);

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

const $multisigAccountsMap = accounts.$list.map(accs => {
  const multisigAccounts = accs.filter(accountUtils.isAnyMultisigAccount);
  const record: Record<string, MultisigAccount | FlexibleMultisigAccount> = {};

  for (const account of multisigAccounts) {
    const multisigAccountId = multisigService.getMultisigAccountId(account);
    record[multisigAccountId] = account;
  }

  return record;
});

const $multisigWallets = walletModel.$wallets.map(wallets => wallets.filter(walletUtils.isAnyMultisig));

const $walletNameByAccountId = combine(
  { multisigAccountsMap: $multisigAccountsMap, multisigWallets: $multisigWallets },
  ({ multisigAccountsMap, multisigWallets }) => {
    const result: Record<string, string> = {};
    for (const [accountId, account] of Object.entries(multisigAccountsMap)) {
      const wallet = multisigWallets.find(w => w.id === account.walletId);
      if (wallet) result[accountId] = wallet.name;
    }
    return result;
  },
);

const $initiator = $initiators.map(initiators => initiators.at(0) ?? null);

const $filteredOperations = combine(
  {
    operations: multisigOperation.$list,
    filter: $filter,
    tab: $tab,
    hiddenIds: $hiddenOperationIds,
    multisigAccountsMap: $multisigAccountsMap,
    walletNameByAccountId: $walletNameByAccountId,
    chains: networkModel.$chains,
  },
  ({ operations, filter, tab, hiddenIds, multisigAccountsMap, walletNameByAccountId, chains }) => {
    return operations.filter(op =>
      filterTx(op, filter, tab, hiddenIds, multisigAccountsMap, walletNameByAccountId, chains),
    );
  },
);

const $hiddenOperationsCount = combine(
  { operations: multisigOperation.$list, hiddenIds: $hiddenOperationIds },
  ({ operations, hiddenIds }) => operations.filter(op => hiddenIds.includes(op.id)).length,
);

const $pendingOperationsCount = combine(
  { operations: multisigOperation.$list, hiddenIds: $hiddenOperationIds },
  ({ operations, hiddenIds }) => operations.filter(op => op.status === 'pending' && !hiddenIds.includes(op.id)).length,
);

const $isTabDataLoading = combine(
  { tab: $tab, onChainReady: multisigOperation.$onChainReady, offChainReady: multisigOperation.$offChainReady },
  ({ tab, onChainReady, offChainReady }) => {
    return tab === 'pending' ? !onChainReady : !offChainReady;
  },
);

sample({
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

// Switch tab based on focused operation status (from deep link)
sample({
  clock: deepLinkModel.$focusedOperationId,
  source: { operations: multisigOperation.$list, hiddenIds: $hiddenOperationIds },
  filter: (_, operationId) => nonNullable(operationId),
  fn: ({ operations, hiddenIds }, operationId): TabFilter => {
    if (hiddenIds.includes(operationId!)) return 'hidden';
    const operation = operations.find(op => op.id === operationId);
    return operation?.status === 'pending' ? 'pending' : 'history';
  },
  target: setTab,
});

// Auto-switch to pending when all hidden operations are unhidden
sample({
  clock: $hiddenOperationIds,
  source: { tab: $tab, operations: multisigOperation.$list },
  filter: ({ tab, operations }, hiddenIds) => {
    const hiddenCount = operations.filter(op => hiddenIds.includes(op.id)).length;
    return tab === 'hidden' && hiddenCount === 0;
  },
  fn: (): TabFilter => 'pending',
  target: setTab,
});

const $chainSyncState = combine(
  {
    expected: multisigOperation.$expectedChainIds,
    fetched: multisigOperation.$fetchedChainIds,
  },
  ({ expected, fetched }): { expected: ChainId[]; fetched: ChainId[] } => ({
    expected,
    fetched,
  }),
);

export const operationsContextModel = {
  $filter,
  $isFiltersSelected,
  $filteredOperations,
  $multisigAccountsMap,
  $multisigWallets,
  $initiator,
  $tab,
  $isTabDataLoading,
  $hiddenOperationIds,
  $hiddenOperationsCount,
  $pendingOperationsCount,
  $chainSyncState,

  setFilter,
  resetFilters,
  setTab,
  hideOperation,
  unhideOperation,
};
