import { combine, createEvent, createStore } from 'effector';
import { persist } from 'effector-storage/local';

import { contactModel } from '@/entities/contact';
import { walletModel } from '@/entities/wallet';
import { accountPresetsModel } from '@/aggregates/account-presets';

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

const $allEntries = accountPresetsModel.$allEntries;
const $matchedEntries = accountPresetsModel.$matchedDashboardEntries;

const $validSelectedIdsRaw = combine($matchedEntries, $allEntries, (matchedEntries, allEntries) => {
  const selectedAccountIds = new Set(matchedEntries.map((e) => e.accountId));

  const validIds: string[] = [];
  for (const entry of allEntries) {
    if (selectedAccountIds.has(entry.accountId)) {
      validIds.push(entry.id);
    }
  }

  return validIds.sort();
});

const $validSelectedIds = createStore<string[]>([], {
  updateFilter: (next, prev) => {
    if (next.length !== prev.length) return true;

    return next.some((id, i) => id !== prev[i]);
  },
});
$validSelectedIds.on($validSelectedIdsRaw, (_, ids) => ids);

const $selectedAccounts = combine($validSelectedIds, walletModel.$availableAccounts, (selectedIds, accounts) => {
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
