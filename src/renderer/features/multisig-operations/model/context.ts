import { combine, createEvent, createStore, restore, sample } from 'effector';
import { produce } from 'immer';
import { interval, throttle } from 'patronum';

import { type Done, persist } from '@/shared/api/storage';
import { type ChainId, type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type DateRange } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts, multisigOperation } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { filterOperation } from '../lib/operations-filter';

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
    record[account.accountId] = account;
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
      filterOperation(op, {
        filters: filter,
        tab,
        hiddenIds,
        multisigAccountsMap,
        walletNameByAccountId,
        chains,
      }),
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
    if (!operation) return 'pending';
    return operation.status === 'pending' ? 'pending' : 'history';
  },
  target: setTab,
});

// Reset to pending tab every time the Operations page is opened
sample({
  clock: multisigOperationsFeature.gate.open,
  fn: (): TabFilter => 'pending',
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
