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

const $savedWidgetOrder = createStore<Record<string, string[]>>({});
persist({ store: $savedWidgetOrder, key: 'dashboard-widget-order', sync: true });
$savedWidgetOrder.on(widgetOrderChanged, (state, { tab, order }) => ({ ...state, [tab]: order }));

/**
 * Widgets that used to be one and are now several, keyed by the DI key the old
 * one was saved under.
 *
 * A saved layout survives the split: the grid drops keys it no longer knows and
 * appends unknown widgets at the end, so without this the four staking cards
 * would silently jump below everything the user had arranged. Expanding the old
 * key in place keeps them where they were.
 */
const WIDGET_SPLITS: Record<string, string[]> = {
  'feature: dashboard/staking-kpi': [
    'feature: dashboard/staking-total-staked',
    'feature: dashboard/staking-apy',
    'feature: dashboard/staking-nominations',
    'feature: dashboard/staking-rewards',
  ],
};

const $widgetOrder = $savedWidgetOrder.map((saved) => {
  const migrated: Record<string, string[]> = {};
  for (const [tab, order] of Object.entries(saved)) {
    migrated[tab] = order.flatMap((key) => WIDGET_SPLITS[key] ?? [key]);
  }

  return migrated;
});

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
