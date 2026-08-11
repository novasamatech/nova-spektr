import { combine, createEvent, createStore } from 'effector';
import { persist } from 'effector-storage/local';

import { contactModel } from '@/entities/contact';
import { walletModel } from '@/entities/wallet';
import { accountPresetsModel } from '@/aggregates/account-presets';
import { type Rect, resolveCollisions } from '../lib/layout-engine';

const tabChanged = createEvent<string>();
const editModeToggled = createEvent();

const layoutSet = createEvent<{ tab: string; layout: Record<string, Rect> }>();
const widgetMoved = createEvent<{ tab: string; key: string; x: number; y: number }>();
const widgetResized = createEvent<{ tab: string; key: string; w: number; h: number }>();
const layoutReset = createEvent<{ tab: string }>();

const $activeTab = createStore('overview');
const $editMode = createStore(false);
$editMode.on(editModeToggled, (state) => !state);

const $widgetLayout = createStore<Record<string, Record<string, Rect>>>({});
persist({ store: $widgetLayout, key: 'dashboard-widget-layout-v1', sync: true });

$widgetLayout
  .on(layoutSet, (state, { tab, layout }) => ({ ...state, [tab]: layout }))
  .on(widgetMoved, (state, { tab, key, x, y }) => {
    const tabLayout = state[tab];
    if (!tabLayout?.[key]) return state;
    const moved = { ...tabLayout, [key]: { ...tabLayout[key]!, x, y } };

    return { ...state, [tab]: resolveCollisions(moved, key) };
  })
  .on(widgetResized, (state, { tab, key, w, h }) => {
    const tabLayout = state[tab];
    if (!tabLayout?.[key]) return state;
    const resized = { ...tabLayout, [key]: { ...tabLayout[key]!, w, h } };

    return { ...state, [tab]: resolveCollisions(resized, key) };
  })
  .on(layoutReset, (state, { tab }) => ({ ...state, [tab]: {} }));

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
  $widgetLayout,
  $editMode,
  tabChanged,
  layoutSet,
  widgetMoved,
  widgetResized,
  layoutReset,
  editModeToggled,
};
