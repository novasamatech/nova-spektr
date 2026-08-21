import { createStore, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { type Chain } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { balanceSubModel } from '@/features/assets-balances';
import { dashboardWidgetsSlot } from '@/pages/Dashboard';
import { dashboardModel } from '@/pages/Dashboard/model/dashboard-model';

import { AccountsTableWidget } from './ui/AccountsTableWidget';

export const dashboardAccountsTableFeature = createFeature({
  name: 'dashboard/accounts-table',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

// Balance data the table joins, wired the same way as dashboard-portfolio-overview
// so the widget stays self-sufficient. Safe to double-register with that feature:
// `balanceSubModel` keys live subscriptions by (account, chain) and skips existing
// keys, so chain subscriptions never double — only the one-shot balance fetch
// below runs once per feature on a selection change.

sample({
  clock: dashboardModel.$selectedAccounts,
  filter: (selectedAccounts) => selectedAccounts.length > 0,
  target: balanceSubModel.fetchAccounts,
});

const pairContactsWithChains = (accountIds: AccountId[], chains: Chain[]) =>
  chains.flatMap((chain) =>
    accountIds
      .filter((accountId) => accountService.isAccountSchemeMatchChain(accountId, chain))
      .map((accountId) => ({ accountId, chain })),
  );

// Contact balances need both fire directions (an inline `combine` as clock is
// the fork pitfall — see the effector gotchas): the first sample covers
// selection changes, the second re-fires when the chains list lands, because
// chains load async at boot and a restored contact selection can arrive first.

sample({
  clock: dashboardModel.$selectedContactAccountIds,
  source: networkModel.$chainsList,
  filter: (chains, accountIds) => accountIds.length > 0 && chains.length > 0,
  fn: (chains, accountIds) => pairContactsWithChains(accountIds, chains),
  target: balanceSubModel.fetchAccountIds,
});

sample({
  clock: networkModel.$chainsList,
  source: dashboardModel.$selectedContactAccountIds,
  filter: (accountIds, chains) => accountIds.length > 0 && chains.length > 0,
  fn: (accountIds, chains) => pairContactsWithChains(accountIds, chains),
  target: balanceSubModel.fetchAccountIds,
});

// Order 1 — second in the flow, straight after Portfolio Overview (order 0,
// two columns wide), which lands this widget at the top of the grid's right
// column. Every other overview widget moved up one order to make room; their
// order relative to each other is unchanged, and a stored layout is never
// re-seeded, so only a first-time (or reset) layout is affected.
//
// Half the grid, and exactly Portfolio Overview's six rows: the two things a
// person opens the dashboard for — the fiat snapshot and where that money
// actually sits — end up side by side and flush, rather than one card hanging
// lower than its neighbour. At this width the table drops to its compact column
// set (see `ui/tableLayout.ts`), which is what makes five purpose columns fit in
// half a screen.
dashboardAccountsTableFeature.inject(dashboardWidgetsSlot, {
  order: 1,
  render: AccountsTableWidget,
  defaultSize: { w: 2, h: 6 },
  minSize: { w: 2, h: 4 },
});
