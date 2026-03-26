import { combine, createEvent, createStore } from 'effector';
import { persist } from 'effector-storage/local';

import { type ID, type WalletType } from '@/shared/core';
import { type ContactTag } from '@/shared/core/types/contact';
import { contactModel } from '@/entities/contact';
import { accountUtils, walletModel } from '@/entities/wallet';
import { type PresetFilterCriteria, dashboardPresetsModel } from '@/aggregates/dashboard-presets';

type DashboardEntry = {
  id: string;
  name: string;
  address: string;
  accountId: string;
  source: 'wallet' | 'local-contact' | 'backend-contact';
  walletId?: ID;
  walletName?: string;
  walletType?: WalletType;
  entityNames?: string[];
  categoryName?: string | null;
  tags?: ContactTag[];
};

function applyPresetFilter(filters: PresetFilterCriteria, entries: DashboardEntry[]): DashboardEntry[] {
  const { sources, entityNames, categoryNames, tags } = filters;

  return entries.filter(
    (entry) =>
      (sources.length === 0 || sources.includes(entry.source)) &&
      (entityNames.length === 0 || (entry.entityNames?.some((e) => entityNames.includes(e)) ?? false)) &&
      (categoryNames.length === 0 || (entry.categoryName != null && categoryNames.includes(entry.categoryName))) &&
      (tags.length === 0 ||
        tags.every(
          (t) =>
            entry.tags?.some((et) => et.tagName === t.tagName && t.values.some((v) => et.values.includes(v))) ?? false,
        )),
  );
}

const tabChanged = createEvent<string>();
const widgetOrderChanged = createEvent<{ tab: string; order: string[] }>();
const editModeToggled = createEvent();

const $activeTab = createStore('overview');
const $editMode = createStore(false);
$editMode.on(editModeToggled, (state) => !state);

const $widgetOrder = createStore<Record<string, string[]>>({});
persist({ store: $widgetOrder, key: 'dashboard-widget-order', sync: true });
$widgetOrder.on(widgetOrderChanged, (state, { tab, order }) => ({ ...state, [tab]: order }));

$activeTab.on(tabChanged, (_, tab) => tab);

const $accountsWithWallets = combine(walletModel.$availableAccounts, walletModel.$wallets, (accounts, wallets) => ({
  accounts,
  wallets,
}));

const $allEntries = combine(
  {
    accountsWithWallets: $accountsWithWallets,
    localContacts: contactModel.$localContacts,
    backendContacts: contactModel.$backendContacts,
  },
  ({ accountsWithWallets: { accounts, wallets }, localContacts, backendContacts }): DashboardEntry[] => {
    const walletNameById = new Map(wallets.map((w) => [w.id, w.name]));
    const walletTypeById = new Map(wallets.map((w) => [w.id, w.type]));
    const entries: DashboardEntry[] = [];

    for (const account of accounts) {
      if (accountUtils.isMultisigSignatoryAccount(account)) continue;

      entries.push({
        id: account.id,
        name: account.name,
        address: account.accountId,
        accountId: account.accountId,
        source: 'wallet',
        walletId: account.walletId,
        walletName: walletNameById.get(account.walletId),
        walletType: walletTypeById.get(account.walletId),
      });
    }

    for (const contact of localContacts) {
      entries.push({
        id: contact.id,
        name: contact.name,
        address: contact.address,
        accountId: contact.accountId,
        source: 'local-contact',
      });
    }

    for (const contact of backendContacts) {
      entries.push({
        id: contact.id,
        name: contact.name,
        address: contact.address,
        accountId: contact.accountId,
        source: 'backend-contact',
        entityNames: contact.entityNames,
        categoryName: contact.categoryName,
        tags: contact.tags,
      });
    }

    return entries;
  },
);

const $matchedEntries = combine(dashboardPresetsModel.$activePreset, $allEntries, (preset, entries) => {
  if (!preset) return entries;

  if (preset.type === 'custom') {
    const selected = new Set(preset.selectedIds);
    return entries.filter((e) => selected.has(e.id));
  }

  return applyPresetFilter(preset.filters, entries);
});

const $validSelectedIds = combine($matchedEntries, $allEntries, (matchedEntries, allEntries) => {
  const matchedIds = new Set(matchedEntries.map((e) => e.id));

  const selectedAccountIds = new Set<string>();
  for (const entry of allEntries) {
    if (matchedIds.has(entry.id)) {
      selectedAccountIds.add(entry.accountId);
    }
  }

  const validIds = new Set<string>();
  for (const entry of allEntries) {
    if (selectedAccountIds.has(entry.accountId)) {
      validIds.add(entry.id);
    }
  }

  return Array.from(validIds);
});

const $selectedAccounts = combine($validSelectedIds, $accountsWithWallets, (selectedIds, { accounts }) => {
  const idSet = new Set(selectedIds);

  return accounts.filter((a) => idSet.has(a.id));
});

const $selectedContactAccountIds = combine($validSelectedIds, contactModel.$contacts, (selectedIds, contacts) => {
  const idSet = new Set(selectedIds);

  return contacts.filter((c) => idSet.has(c.id)).map((c) => c.accountId);
});

export const dashboardModel = {
  $allEntries,
  $selectedIds: $validSelectedIds,
  $selectedAccounts,
  $selectedContactAccountIds,
  $activeTab,
  $widgetOrder,
  $editMode,
  tabChanged,
  widgetOrderChanged,
  editModeToggled,
};

export { applyPresetFilter };
export type { DashboardEntry };
