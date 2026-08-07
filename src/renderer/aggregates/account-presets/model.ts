import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { toAddress } from '@/shared/lib/utils';
import { contactModel } from '@/entities/contact';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel } from '@/entities/wallet';

import {
  type BackendContactSeed,
  type LocalContactSeed,
  type WalletEntrySeed,
  applyPresetFilter,
  buildMergedEntries,
  matchPreset,
} from './lib';
import {
  type AccountEntry,
  type AccountPreset,
  type PresetFilterCriteria,
  type PresetType,
  EMPTY_FILTERS,
} from './types';

const MAX_SEGMENTS = 3;
const PRESETS_KEY = 'account_presets';
const LEGACY_PRESETS_KEY = 'dashboard_presets';
const DASHBOARD_ACTIVE_KEY = 'dashboard_active_preset';
const OPERATIONS_ACTIVE_KEY = 'operations_active_preset';

// One-shot migration: move presets from the legacy `dashboard_presets` key to the shared
// `account_presets` key. Runs synchronously at module load before `persist` hydrates the store.
// Idempotent: if the new key already holds data, the legacy key is just cleaned up.
try {
  if (typeof localStorage !== 'undefined') {
    const legacy = localStorage.getItem(LEGACY_PRESETS_KEY);
    if (legacy != null) {
      if (localStorage.getItem(PRESETS_KEY) == null) {
        localStorage.setItem(PRESETS_KEY, legacy);
      }
      localStorage.removeItem(LEGACY_PRESETS_KEY);
    }
  }
} catch {
  // noop — storage may be unavailable
}

type CreatePresetParams = {
  name: string;
  type: PresetType;
  filters: PresetFilterCriteria;
  selectedIds: string[];
};

type UpdatePresetParams = {
  id: string;
  name?: string;
  type?: PresetType;
  filters?: PresetFilterCriteria;
  selectedIds?: string[];
};

const presetCreated = createEvent<CreatePresetParams>();
const presetUpdated = createEvent<UpdatePresetParams>();
const presetDeleted = createEvent<string>();
const presetRestored = createEvent<{ preset: AccountPreset; index: number }>();
const presetsReordered = createEvent<string[]>();

// Per-surface activation events
const dashboardPresetActivated = createEvent<string | null>();
const operationsPresetActivated = createEvent<string | null>();

const $presets = createStore<AccountPreset[]>([]);
persist({ store: $presets, key: PRESETS_KEY, sync: true });

const $activeDashboardPresetId = createStore<string | null>(null);
persist({ store: $activeDashboardPresetId, key: DASHBOARD_ACTIVE_KEY, sync: true });

const $activeOperationsPresetId = createStore<string | null>(null);
persist({ store: $activeOperationsPresetId, key: OPERATIONS_ACTIVE_KEY, sync: true });

$presets.on(presetCreated, (presets, { name, type, filters, selectedIds }) => [
  ...presets,
  {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 30),
    type,
    filters,
    selectedIds,
  },
]);

$presets.on(presetUpdated, (presets, { id, name, type, filters, selectedIds }) =>
  presets.map(p => {
    if (p.id !== id) return p;

    return {
      ...p,
      ...(name !== undefined && { name: name.trim().slice(0, 30) }),
      ...(type !== undefined && { type }),
      ...(filters !== undefined && { filters }),
      ...(selectedIds !== undefined && { selectedIds }),
    };
  }),
);

$presets.on(presetDeleted, (presets, id) => presets.filter(p => p.id !== id));

$presets.on(presetRestored, (presets, { preset, index }) => {
  const next = [...presets];
  next.splice(index, 0, preset);

  return next;
});

$presets.on(presetsReordered, (presets, orderedIds) => {
  const byId = new Map(presets.map(p => [p.id, p]));
  return orderedIds.map(id => byId.get(id)).filter(Boolean) as AccountPreset[];
});

// When the active preset on a surface is deleted, clear the selection for that surface.
sample({
  clock: presetDeleted,
  source: $activeDashboardPresetId,
  filter: (activeId, deletedId) => activeId === deletedId,
  fn: () => null,
  target: $activeDashboardPresetId,
});

sample({
  clock: presetDeleted,
  source: $activeOperationsPresetId,
  filter: (activeId, deletedId) => activeId === deletedId,
  fn: () => null,
  target: $activeOperationsPresetId,
});

sample({ clock: dashboardPresetActivated, target: $activeDashboardPresetId });
sample({ clock: operationsPresetActivated, target: $activeOperationsPresetId });

const resolveActivePreset = (presets: AccountPreset[], activeId: string | null) => {
  if (!activeId) return null;
  return presets.find(p => p.id === activeId) ?? null;
};

const $activeDashboardPreset = combine($presets, $activeDashboardPresetId, resolveActivePreset);
const $activeOperationsPreset = combine($presets, $activeOperationsPresetId, resolveActivePreset);

// Stable order — presets keep their creation order, no rearranging on select
const $segmentPresets = $presets.map(presets => presets.slice(0, MAX_SEGMENTS));
const $overflowPresets = $presets.map(presets => presets.slice(MAX_SEGMENTS));

// ----- $allEntries (lifted from dashboard-model) -----

const $accountsWithWallets = combine(walletModel.$availableAccounts, walletModel.$wallets, (accounts, wallets) => ({
  accounts,
  wallets,
}));

const $allEntries = combine(
  {
    accountsWithWallets: $accountsWithWallets,
    localContacts: contactModel.$localContacts,
    backendContacts: contactModel.$backendContacts,
    chains: networkModel.$chains,
  },
  ({ accountsWithWallets: { accounts, wallets }, localContacts, backendContacts, chains }): AccountEntry[] => {
    const walletNameById = new Map(wallets.map(w => [w.id, w.name]));
    const walletTypeById = new Map(wallets.map(w => [w.id, w.type]));

    const walletSeeds: WalletEntrySeed[] = [];
    for (const account of accounts) {
      if (accountUtils.isMultisigSignatoryAccount(account)) continue;
      const addressPrefix = account.type === 'chain' ? chains[account.chainId]?.addressPrefix : undefined;
      walletSeeds.push({
        id: account.id,
        name: account.name,
        address: toAddress(account.accountId, { prefix: addressPrefix }),
        accountId: account.accountId,
        walletId: account.walletId,
        walletName: walletNameById.get(account.walletId),
        walletType: walletTypeById.get(account.walletId),
      });
    }

    const localSeeds: LocalContactSeed[] = localContacts.map(c => ({
      id: c.id,
      name: c.name,
      address: c.address,
      accountId: c.accountId,
    }));

    const backendSeeds: BackendContactSeed[] = backendContacts.map(c => ({
      id: c.id,
      name: c.name,
      address: c.address,
      accountId: c.accountId,
      chainId: c.chainId,
      fields: c.fields,
    }));

    return buildMergedEntries({ walletSeeds, localContacts: localSeeds, backendContacts: backendSeeds });
  },
);

// Shallow-compare adjacent matched-entry arrays to avoid downstream cascades
// (preset-scoped multisigs, external-multisig discovery, Operations feature
// subscription) when a sync updates `$allEntries` without actually changing
// the matched subset.
const matchedEntriesFilter = (next: AccountEntry[], prev: AccountEntry[]): boolean => {
  if (next.length !== prev.length) return true;
  for (let i = 0; i < next.length; i++) {
    if (next[i]?.id !== prev[i]?.id) return true;
  }
  return false;
};

const $entriesByPresetId = combine($presets, $allEntries, (presets, entries) => {
  const map: Record<string, AccountEntry[]> = {};
  for (const preset of presets) {
    map[preset.id] = matchPreset(preset, entries);
  }

  return map;
});

type MatchedSource = {
  activeId: string | null;
  byPresetId: Record<string, AccountEntry[]>;
  all: AccountEntry[];
};

const resolveMatched = ({ activeId, byPresetId, all }: MatchedSource) =>
  activeId ? (byPresetId[activeId] ?? all) : all;

const resolveMatchedWithQuickFilter = ({
  quickFilter,
  ...source
}: MatchedSource & { quickFilter: PresetFilterCriteria }) => applyPresetFilter(quickFilter, resolveMatched(source));

/**
 * An ad-hoc narrowing on top of whichever preset is active.
 *
 * Deliberately **not persisted**: a saved preset is a decision the user made
 * and named, a quick filter is a look they are taking right now, and a look
 * that survived a restart would silently scope the whole dashboard to something
 * nobody remembers choosing. "Save as preset" is how a look becomes a
 * decision.
 */
const $dashboardQuickFilter = createStore<PresetFilterCriteria>(EMPTY_FILTERS);
const $operationsQuickFilter = createStore<PresetFilterCriteria>(EMPTY_FILTERS);

const dashboardQuickFilterChanged = createEvent<PresetFilterCriteria>();
const operationsQuickFilterChanged = createEvent<PresetFilterCriteria>();

$dashboardQuickFilter.on(dashboardQuickFilterChanged, (_, filters) => filters);
$operationsQuickFilter.on(operationsQuickFilterChanged, (_, filters) => filters);

const $matchedDashboardEntriesRaw = combine(
  {
    activeId: $activeDashboardPresetId,
    byPresetId: $entriesByPresetId,
    all: $allEntries,
    quickFilter: $dashboardQuickFilter,
  },
  resolveMatchedWithQuickFilter,
);
const $matchedDashboardEntries = createStore<AccountEntry[]>([], { updateFilter: matchedEntriesFilter });
$matchedDashboardEntries.on($matchedDashboardEntriesRaw, (_, next) => next);

const $matchedOperationsEntriesRaw = combine(
  {
    activeId: $activeOperationsPresetId,
    byPresetId: $entriesByPresetId,
    all: $allEntries,
    quickFilter: $operationsQuickFilter,
  },
  resolveMatchedWithQuickFilter,
);
const $matchedOperationsEntries = createStore<AccountEntry[]>([], { updateFilter: matchedEntriesFilter });
$matchedOperationsEntries.on($matchedOperationsEntriesRaw, (_, next) => next);

export const accountPresetsModel = {
  $presets,
  $segmentPresets,
  $overflowPresets,
  $allEntries,
  $entriesByPresetId,

  $activeDashboardPresetId,
  $activeDashboardPreset,
  $matchedDashboardEntries,
  $dashboardQuickFilter,

  $activeOperationsPresetId,
  $activeOperationsPreset,
  $matchedOperationsEntries,
  $operationsQuickFilter,

  presetCreated,
  presetUpdated,
  presetDeleted,
  presetRestored,
  presetsReordered,

  dashboardPresetActivated,
  operationsPresetActivated,
  dashboardQuickFilterChanged,
  operationsQuickFilterChanged,
};
