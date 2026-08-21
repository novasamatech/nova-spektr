import { type Store, combine, createEvent, createStore, sample } from 'effector';
import { produce } from 'immer';
import { interval, throttle } from 'patronum';

import { type Done, persist } from '@/shared/api/storage';
import {
  type ChainId,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type ProxiedAccount,
  AccountType,
} from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type DateRange } from '@/shared/ui-kit';
import {
  type AnyAccount,
  type MultisigOperation,
  accountService,
  accounts,
  contactMultisigsModel,
  identity,
  multisigOperation,
} from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { accountPresetsModel } from '@/aggregates/account-presets';
import { $searchResolvers, haveSameMatchedIds, searchOperationRows } from '@/aggregates/operations-search';
import { walletSelect } from '@/aggregates/wallet-select';
import { bucketOperations } from '../lib/bucket-operations';
import {
  type WalletSearchEntry,
  buildOperationSearchRow,
  filterOperation,
  getWalletSearchEntries,
  shouldAlwaysShowInProgress,
} from '../lib/operations-filter';
import { type StatusFilterValue, getOperationSection } from '../lib/operations-sections';
import { type OperationsSort, type SortKey, getNextSortState, sortOperations } from '../lib/operations-sort';
import { type OperationWithAccount } from '../lib/types';

import { deepLinkModel } from './deep-link';
import { multisigOperationsFeature } from './feature';

export { type OperationWithAccount } from '../lib/types';

interface SelectedFilters {
  network: string[];
  type: string[];
  proxyType: string[];
  status: StatusFilterValue[];
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
  network: [],
  type: [],
  proxyType: [],
  status: [],
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

// Any non-search filter active → tabs collapse to "All operations" (search alone doesn't merge scope).
const $isScopeMerged = $filter.map(filter =>
  Boolean(
    filter.network.length ||
      filter.type.length ||
      filter.proxyType.length ||
      filter.status.length ||
      filter.dateRange?.from ||
      filter.dateRange?.to,
  ),
);

const $isFiltersSelected = combine($isScopeMerged, $filter, (merged, filter) => merged || Boolean(filter.searchQuery));

const $tab = createStore<TabFilter>('pending').on(setTab, (_, tab) => tab);

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

const haveSameRefs = <T>(next: T[], prev: T[]) => {
  if (next.length !== prev.length) return false;

  return next.every((item, index) => item === prev[index]);
};

const $walletMultisigAccountsRaw = accounts.$list.map(accs => accs.filter(accountUtils.isAnyMultisigAccount));
const $walletMultisigAccounts = createStore<(MultisigAccount | FlexibleMultisigAccount)[]>([], {
  updateFilter: (next, prev) => !haveSameRefs(next, prev),
});
$walletMultisigAccounts.on($walletMultisigAccountsRaw, (_, next) => next);

const $proxiedAccountsRaw = accounts.$list.map(accs => accs.filter(accountUtils.isProxiedAccount));
const $proxiedAccounts = createStore<ProxiedAccount[]>([], {
  updateFilter: (next, prev) => !haveSameRefs(next, prev),
});
$proxiedAccounts.on($proxiedAccountsRaw, (_, next) => next);

// Union of user-owned multisig accounts + synthetic records built from
// contact-backed multisigs discovered by `contactMultisigsModel`. Dedupe drops
// externals the user also owns as a real wallet (wallet ownership wins).
// Preset scoping is applied downstream by `$presetScopedMultisigAccounts` —
// this combine doesn't need to know about presets.
const $multisigAccounts = combine(
  $walletMultisigAccounts,
  contactMultisigsModel.$contactMultisigs,
  (walletMultisigs, contactMultisigs) => {
    const walletIds = new Set<AccountId>(walletMultisigs.map(contactMultisigsModel.resolveMultisigAccountId));
    const externals = contactMultisigs.filter(cm => !walletIds.has(cm.accountId));
    if (externals.length === 0) return walletMultisigs;
    return [...walletMultisigs, ...externals.map(contactMultisigsModel.toSyntheticMultisigAccount)];
  },
);

// When an Operations preset is active, its matched entries define the scope of visible accounts.
// `null` means no preset is active → no scoping, use every multisig account.
const $presetScopedAccountIds = accountPresetsModel.$matchedOperationsEntries.map(entries => {
  // If no preset is active, `$matchedOperationsEntries` returns `$allEntries` — but so do empty
  // presets, so we can't distinguish them here. Use the active preset id instead.
  return new Set(entries.map(e => e.accountId));
});

const $presetScopedMultisigAccounts = combine(
  {
    multisigAccounts: $multisigAccounts,
    activePresetId: accountPresetsModel.$activeOperationsPresetId,
    scopedAccountIds: $presetScopedAccountIds,
  },
  ({ multisigAccounts, activePresetId, scopedAccountIds }) => {
    if (activePresetId === null) return multisigAccounts;
    return multisigAccounts.filter(acc => scopedAccountIds.has(acc.accountId));
  },
);

const $multisigWallets = walletModel.$wallets.map(wallets => wallets.filter(walletUtils.isAnyMultisig));

// Search inputs derive from contacts and identities, which churn while loading.
// Without this, every such update re-runs the filter chain even when the
// resolved value is identical.
const createGuardedStore = <T>(source: Store<T>, defaultValue: T, isSame: (next: T, prev: T) => boolean) => {
  const $guarded = createStore(defaultValue, { updateFilter: (next, prev) => !isSame(next, prev) });
  $guarded.on(source, (_, next) => next);

  return $guarded;
};

const haveSameWalletSearchEntries = (next: WalletSearchEntry[], prev: WalletSearchEntry[]) => {
  if (next.length !== prev.length) return false;

  return next.every((wallet, index) => wallet.id === prev[index]?.id && wallet.name === prev[index]?.name);
};

const $multisigWalletSearchEntriesRaw = combine(
  {
    wallets: $multisigWallets,
    accounts: accounts.$list,
    contacts: contactModel.$contacts,
    identities: identity.$list,
    chains: networkModel.$chains,
  },
  ({ wallets, ...sources }): WalletSearchEntry[] => getWalletSearchEntries(wallets, sources),
);
const $multisigWalletSearchEntries = createGuardedStore<WalletSearchEntry[]>(
  $multisigWalletSearchEntriesRaw,
  [],
  haveSameWalletSearchEntries,
);

const $initiator = $initiators.map(initiators => initiators.at(0) ?? null);

const $operationsWithAccounts = combine(
  {
    operations: multisigOperation.$list,
    multisigAccounts: $presetScopedMultisigAccounts,
    proxiedAccounts: $proxiedAccounts,
    accountsPopulated: accounts.$populated,
  },
  ({ operations, multisigAccounts, proxiedAccounts, accountsPopulated }): OperationWithAccount[] => {
    if (!accountsPopulated) return [];

    // Build lookup maps for O(1) account resolution instead of O(m) linear scan per operation
    const byAccountId = new Map<string, (MultisigAccount | FlexibleMultisigAccount)[]>();
    const byMultisigAccountId = new Map<string, (MultisigAccount | FlexibleMultisigAccount)[]>();
    const regularMultisigById = new Map<AccountId, MultisigAccount>();

    for (const acc of multisigAccounts) {
      if (accountUtils.isFlexibleMultisigAccount(acc)) {
        const key = `${acc.accountId}:${acc.multisigAccountId}`;
        const list = byAccountId.get(key) ?? [];
        list.push(acc);
        byAccountId.set(key, list);

        const mList = byMultisigAccountId.get(acc.multisigAccountId) ?? [];
        mList.push(acc);
        byMultisigAccountId.set(acc.multisigAccountId, mList);
      } else if (accountUtils.isMultisigAccount(acc)) {
        regularMultisigById.set(acc.accountId, acc);

        const list = byMultisigAccountId.get(acc.accountId) ?? [];
        list.push(acc);
        byMultisigAccountId.set(acc.accountId, list);
      }
    }

    const byProxiedMultisigAccountId = new Map<string, FlexibleMultisigAccount>();
    for (const proxied of proxiedAccounts) {
      for (const connection of proxied.connections) {
        const multisig = regularMultisigById.get(connection.proxyAccountId);
        if (!multisig) continue;

        const key = `${proxied.accountId}:${multisig.accountId}`;
        byProxiedMultisigAccountId.set(key, {
          ...proxied,
          accountType: AccountType.FLEX_MULTISIG,
          multisigAccountId: multisig.accountId,
          signatories: multisig.signatories,
          threshold: multisig.threshold,
          proxyType: connection.proxyType,
        });
      }
    }

    const findAccount = (op: MultisigOperation) => {
      if (op.proxiedAccountId) {
        const key = `${op.proxiedAccountId}:${op.multisigAccountId}`;
        const flex = byAccountId.get(key)?.find(a => accountUtils.isFlexibleMultisigAccount(a));
        if (flex) return flex;

        const proxiedMultisig = byProxiedMultisigAccountId.get(key);
        if (proxiedMultisig) return proxiedMultisig;
      }
      const candidates = byMultisigAccountId.get(op.multisigAccountId);
      return candidates?.find(a => accountUtils.isMultisigAccount(a)) ?? candidates?.[0];
    };

    const result: OperationWithAccount[] = [];
    for (const op of operations) {
      const account = findAccount(op);
      if (account) result.push({ operation: op, account });
    }

    return result;
  },
);

const $searchMatchedOperationIdsRaw = combine(
  {
    operationsWithAccounts: $operationsWithAccounts,
    searchQuery: $filter.map(filter => filter.searchQuery),
    multisigWallets: $multisigWalletSearchEntries,
    chains: networkModel.$chains,
    resolvers: $searchResolvers,
  },
  ({ operationsWithAccounts, searchQuery, multisigWallets, chains, resolvers }): Set<string> | null => {
    if (!searchQuery.trim()) return null;

    const walletNames = new Map(multisigWallets.map(wallet => [wallet.id, wallet.name]));
    const rows = operationsWithAccounts.map(({ operation, account }) =>
      buildOperationSearchRow(operation, account, chains, walletNames, resolvers.resolveWalletName),
    );

    return searchOperationRows(rows, searchQuery, resolvers);
  },
);

// The search itself still recomputes on name-source churn; the guard only stops
// it from re-running the downstream filter chain, and the no-query early return
// above keeps the common case free.
const $searchMatchedOperationIds = createGuardedStore<Set<string> | null>(
  $searchMatchedOperationIdsRaw,
  null,
  haveSameMatchedIds,
);

const $filteredOperations = combine(
  {
    operationsWithAccounts: $operationsWithAccounts,
    filter: $filter,
    tab: $tab,
    hiddenIds: $hiddenOperationIds,
    searchMatchedIds: $searchMatchedOperationIds,
    isScopeMerged: $isScopeMerged,
  },
  ({ operationsWithAccounts, filter, tab, hiddenIds, searchMatchedIds, isScopeMerged }): OperationWithAccount[] => {
    return operationsWithAccounts.filter(({ operation, account }) =>
      filterOperation(operation, account, {
        filters: filter,
        tab,
        hiddenIds,
        searchMatchedIds,
        isScopeMerged,
      }),
    );
  },
);

const $hiddenOperationsCount = combine(
  { operationsWithAccounts: $operationsWithAccounts, hiddenIds: $hiddenOperationIds },
  ({ operationsWithAccounts, hiddenIds }) =>
    operationsWithAccounts.filter(({ operation }) => hiddenIds.includes(operation.id)).length,
);

const $pendingOperationsCount = combine(
  { operationsWithAccounts: $operationsWithAccounts, hiddenIds: $hiddenOperationIds },
  ({ operationsWithAccounts, hiddenIds }) =>
    operationsWithAccounts.filter(
      ({ operation }) => operation.status === 'pending' && !hiddenIds.includes(operation.id),
    ).length,
);

const $historyOperationsCount = combine(
  { operationsWithAccounts: $operationsWithAccounts, hiddenIds: $hiddenOperationIds },
  ({ operationsWithAccounts, hiddenIds }) =>
    operationsWithAccounts.filter(
      ({ operation }) => operation.status !== 'pending' && !hiddenIds.includes(operation.id),
    ).length,
);

const $visibleOperationsCount = $filteredOperations.map(operations => operations.length);

const sortToggled = createEvent<SortKey>();
const $sort = createStore<OperationsSort>(null).on(sortToggled, getNextSortState);

// The drafts group shares this state, hence `StatusFilterValue` rather than `OperationSection`.
// Never reset: a collapsed group stays collapsed for as long as the app runs, across page visits.
const toggleSection = createEvent<StatusFilterValue>();
// Deep links target it (see `draft-deep-link-expand.ts` for the Drafts group): a link must land on
// a visible row. Same-reference return keeps an already expanded group from emitting an update.
const expandSection = createEvent<StatusFilterValue>();
const $collapsedSections = createStore<Partial<Record<StatusFilterValue, boolean>>>({})
  .on(toggleSection, (state, section) => ({ ...state, [section]: !state[section] }))
  .on(expandSection, (state, section) => (state[section] ? { ...state, [section]: false } : state));

const $sectionedOperations = combine(
  {
    operations: $filteredOperations,
    sort: $sort,
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
    allAccounts: accounts.$list,
    contacts: contactModel.$contacts,
    identities: identity.$list,
    hiddenIds: $hiddenOperationIds,
    isScopeMerged: $isScopeMerged,
    tab: $tab,
    filter: $filter,
  },
  ({ operations, sort, chains, wallets, allAccounts, contacts, identities, hiddenIds, isScopeMerged, tab, filter }) => {
    // In the merged scope hidden ops (surfaced via the Status filter) get their
    // own trailing section; on the Hidden tab they keep their status sections.
    const buckets = bucketOperations(operations, {
      hiddenIds,
      isScopeMerged,
      // The Pending tab (and the merged scope, which replaces the tabs) keeps its In-progress
      // group even when empty — but only when nothing narrows the list.
      alwaysShowInProgress: shouldAlwaysShowInProgress({ tab, isScopeMerged, filter }),
    });

    return buckets.map(({ section, items }) => ({
      section,
      items: sortOperations(items, sort, { chains, wallets, accounts: allAccounts, contacts, identities }),
    }));
  },
);

const $isTabDataLoading = combine(
  {
    tab: $tab,
    isScopeMerged: $isScopeMerged,
    onChainReady: multisigOperation.$onChainReady,
    offChainReady: multisigOperation.$offChainReady,
    accountsPopulated: accounts.$populated,
  },
  ({ tab, isScopeMerged, onChainReady, offChainReady, accountsPopulated }) => {
    if (!accountsPopulated) return true;

    // Merged scope shows pending (on-chain) and resolved (off-chain indexer) ops
    // together, so it must wait on both — keying off the (forced-pending) tab would
    // stop the loader early and flash the empty state before history rows load.
    if (isScopeMerged) return !onChainReady || !offChainReady;

    return tab === 'pending' ? !onChainReady : !offChainReady;
  },
);

sample({
  clock: multisigOperationsFeature.running,
  filter: ({ accountIds, apis }) => accountIds.length > 0 && Object.keys(apis).length > 0,
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
    if (!operation) {
      return 'pending';
    }
    return operation.status === 'pending' ? 'pending' : 'history';
  },
  target: setTab,
});

// Deep link into a collapsed section must expand it, otherwise the focused
// operation is excluded from the virtualized list and scroll-to-focus no-ops.
sample({
  clock: deepLinkModel.$focusedOperationId,
  source: { operations: multisigOperation.$list, collapsed: $collapsedSections },
  filter: ({ operations, collapsed }, operationId) => {
    if (nullable(operationId)) return false;
    const operation = operations.find(op => op.id === operationId);

    return nonNullable(operation) && Boolean(collapsed[getOperationSection(operation)]);
  },
  fn: ({ operations, collapsed }, operationId) => {
    const operation = operations.find(op => op.id === operationId)!;

    return { ...collapsed, [getOperationSection(operation)]: false };
  },
  target: $collapsedSections,
});

// Reset to pending tab every time the Operations page is opened (skip if deep link is active)
sample({
  clock: multisigOperationsFeature.gate.open,
  source: { focusedId: deepLinkModel.$focusedOperationId, isLoading: deepLinkModel.$isDeepLinkLoading },
  filter: ({ focusedId, isLoading }) => {
    return nullable(focusedId) && !isLoading;
  },
  fn: (): TabFilter => 'pending',
  target: setTab,
});

// Merged scope always behaves as pending-based (hidden ops excluded, drafts visible) —
// force the tab to 'pending' whenever a non-search filter activates from another tab.
sample({
  clock: setFilter,
  source: { tab: $tab, isMerged: $isScopeMerged },
  filter: ({ tab, isMerged }) => isMerged && tab !== 'pending',
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

// One boolean for the sync toast: a wallet without multisig accounts never syncs anything
// (`$expectedChainIds` stays empty forever, so the toast would never dismiss), otherwise we
// are syncing until every expected chain has reported.
const $isChainSyncing = combine($multisigAccounts, $chainSyncState, (multisigAccounts, { expected, fetched }) => {
  return multisigAccounts.length > 0 && (expected.length === 0 || fetched.length < expected.length);
});

// Closing the toast is remembered for the session: offline, `expected` stays empty for as long as
// no API connects, so `$isChainSyncing` never drops and every visit to the page would re-create a
// toast the user already closed. A new set of expected chains (a fresh subscription, or the reset
// on leaving the page) starts a new sync cycle and shows the toast again.
const syncToastDismissed = createEvent();
const $isSyncToastDismissed = createStore(false)
  .on(syncToastDismissed, () => true)
  .reset(multisigOperation.$expectedChainIds);

const $isSyncToastVisible = combine($isChainSyncing, $isSyncToastDismissed, (syncing, dismissed) => {
  return syncing && !dismissed;
});

export const operationsContextModel = {
  $filter,
  $isFiltersSelected,
  $isScopeMerged,
  $filteredOperations,
  $sectionedOperations,
  $multisigAccounts,
  $presetScopedMultisigAccounts,
  $multisigWallets,
  $initiator,
  $tab,
  $isTabDataLoading,
  $hiddenOperationIds,
  $hiddenOperationsCount,
  $pendingOperationsCount,
  $historyOperationsCount,
  $visibleOperationsCount,
  $chainSyncState,
  $isChainSyncing,
  $isSyncToastDismissed,
  $isSyncToastVisible,
  $sort,
  $collapsedSections,

  setFilter,
  resetFilters,
  setTab: setTab,
  hideOperation,
  unhideOperation,
  sortToggled,
  toggleSection,
  expandSection,
  syncToastDismissed,
};
