import { combine, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

import { type ID, type WalletType } from '@/shared/core';
import { contactModel } from '@/entities/contact';
import { accountUtils, walletModel } from '@/entities/wallet';

type DashboardEntry = {
  id: string;
  name: string;
  address: string;
  accountId: string;
  source: 'wallet' | 'contact';
  walletId?: ID;
  walletName?: string;
  walletType?: WalletType;
};

const selectionChanged = createEvent<string[]>();
const selectAll = createEvent();
const deselectAll = createEvent();

const $initialized = createStore(false);

persist({ store: $initialized, key: 'dashboard-initialized' });

const $selectedIds = createStore<string[]>([]);

persist({ store: $selectedIds, key: 'dashboard-selected-ids' });

const $accountsWithWallets = combine(walletModel.$availableAccounts, walletModel.$wallets, (accounts, wallets) => ({
  accounts,
  wallets,
}));

const $allEntries = combine(
  $accountsWithWallets,
  contactModel.$contacts,
  ({ accounts, wallets }, contacts): DashboardEntry[] => {
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

    for (const contact of contacts) {
      entries.push({
        id: contact.id,
        name: contact.name,
        address: contact.address,
        accountId: contact.accountId,
        source: 'contact',
      });
    }

    return entries;
  },
);

const $validSelectedIds = combine($selectedIds, $allEntries, (selectedIds, entries) => {
  const entryIds = new Set(entries.map((e) => e.id));
  const validIds = new Set(selectedIds.filter((id) => entryIds.has(id)));

  // Expand selection to all entries sharing an accountId with any selected entry
  const selectedAccountIds = new Set<string>();
  for (const entry of entries) {
    if (validIds.has(entry.id)) {
      selectedAccountIds.add(entry.accountId);
    }
  }
  for (const entry of entries) {
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

// Auto-select all on first visit
const autoSelectAll = sample({
  clock: $allEntries,
  source: $initialized,
  filter: (isInit, entries) => !isInit && entries.length > 0,
  fn: (_, entries) => entries.map((e) => e.id),
});

$selectedIds.on(autoSelectAll, (_, ids) => ids);
$initialized.on(autoSelectAll, () => true);

sample({
  clock: selectionChanged,
  target: $selectedIds,
});

sample({
  clock: selectAll,
  source: $allEntries,
  fn: (entries) => entries.map((e) => e.id),
  target: $selectedIds,
});

sample({
  clock: deselectAll,
  fn: () => [],
  target: $selectedIds,
});

export const dashboardModel = {
  $allEntries,
  $selectedIds: $validSelectedIds,
  $selectedAccounts,
  $selectedContactAccountIds,

  selectionChanged,
  selectAll,
  deselectAll,
};

export type { DashboardEntry };
