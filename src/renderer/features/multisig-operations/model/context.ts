import { combine, createEvent, createStore, sample } from 'effector';
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
  multisigOperation,
} from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { accountPresetsModel } from '@/aggregates/account-presets';
import { walletSelect } from '@/aggregates/wallet-select';
import { type OperationsFilterContext, filterOperation } from '../lib/operations-filter';
import { type OperationSection } from '../lib/operations-sections';

import { deepLinkModel } from './deep-link';
import { multisigOperationsFeature } from './feature';

export type OperationWithAccount = {
  operation: MultisigOperation;
  account: MultisigAccount | FlexibleMultisigAccount;
};

interface SelectedFilters {
  network: string[];
  type: string[];
  proxyType: string[];
  status: OperationSection[];
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

const $isFiltersSelected = $filter.map(filter =>
  Boolean(
    filter.network.length ||
      filter.type.length ||
      filter.proxyType.length ||
      filter.dateRange?.from ||
      filter.dateRange?.to ||
      filter.searchQuery,
  ),
);

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

const haveSameWalletSearchEntries = (
  next: OperationsFilterContext['multisigWallets'],
  prev: OperationsFilterContext['multisigWallets'],
) => {
  if (next.length !== prev.length) return false;

  return next.every((wallet, index) => wallet.id === prev[index]?.id && wallet.name === prev[index]?.name);
};

const $multisigWalletSearchEntriesRaw = $multisigWallets.map((wallets): OperationsFilterContext['multisigWallets'] =>
  wallets.map(({ id, name }) => ({ id, name })),
);
const $multisigWalletSearchEntries = createStore<OperationsFilterContext['multisigWallets']>([], {
  updateFilter: (next, prev) => !haveSameWalletSearchEntries(next, prev),
});
$multisigWalletSearchEntries.on($multisigWalletSearchEntriesRaw, (_, next) => next);

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

const $filteredOperations = combine(
  {
    operationsWithAccounts: $operationsWithAccounts,
    filter: $filter,
    tab: $tab,
    hiddenIds: $hiddenOperationIds,
    multisigWallets: $multisigWalletSearchEntries,
    chains: networkModel.$chains,
  },
  ({ operationsWithAccounts, filter, tab, hiddenIds, multisigWallets, chains }): OperationWithAccount[] => {
    return operationsWithAccounts.filter(({ operation, account }) =>
      filterOperation(operation, account, {
        filters: filter,
        tab,
        hiddenIds,
        multisigWallets,
        chains,
        // Task 2 wires the real merged-scope condition; libs default to per-tab filtering for now.
        isScopeMerged: false,
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

const $isTabDataLoading = combine(
  {
    tab: $tab,
    onChainReady: multisigOperation.$onChainReady,
    offChainReady: multisigOperation.$offChainReady,
    accountsPopulated: accounts.$populated,
  },
  ({ tab, onChainReady, offChainReady, accountsPopulated }) => {
    if (!accountsPopulated) return true;

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
  $multisigAccounts,
  $presetScopedMultisigAccounts,
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
  setTab: setTab,
  hideOperation,
  unhideOperation,
};
