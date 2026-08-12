import { combine, createStore, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
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

sample({
  clock: combine(dashboardModel.$selectedContactAccountIds, networkModel.$chainsList),
  filter: ([accountIds]) => accountIds.length > 0,
  fn: ([accountIds, chains]) =>
    chains.flatMap((chain) =>
      accountIds
        .filter((accountId) => accountService.isAccountSchemeMatchChain(accountId, chain))
        .map((accountId) => ({ accountId, chain })),
    ),
  target: balanceSubModel.fetchAccountIds,
});

// Existing overview widgets occupy orders 0–3; leaving a gap up to 10 gives
// this widget room to split into several without renumbering its neighbors.
dashboardAccountsTableFeature.inject(dashboardWidgetsSlot, {
  order: 10,
  render: AccountsTableWidget,
  defaultSize: { w: 4, h: 6 },
  minSize: { w: 2, h: 4 },
});
