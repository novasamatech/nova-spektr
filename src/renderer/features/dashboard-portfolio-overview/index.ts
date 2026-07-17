import { combine, createStore, sample } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { accountService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { vestingPortfolioModel } from '@/aggregates/vesting-portfolio';
import { balanceSubModel } from '@/features/assets-balances';
import { dashboardWidgetsSlot } from '@/pages/Dashboard';
import { dashboardModel } from '@/pages/Dashboard/model/dashboard-model';

import { PortfolioOverviewWidget, portfolioVestingSlot } from './ui/PortfolioOverviewWidget';

export { portfolioVestingSlot };

export const dashboardPortfolioOverviewFeature = createFeature({
  name: 'dashboard/portfolio-overview',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

sample({
  clock: dashboardModel.$selectedAccounts,
  filter: (accounts) => accounts.length > 0,
  target: balanceSubModel.fetchAccounts,
});

// Scope vesting to the card's account filter: the callout follows the selected
// accounts rather than every non-hidden account in the wallet.
sample({
  clock: dashboardModel.$selectedAccounts,
  target: vestingPortfolioModel.accountsScopeChanged,
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

dashboardPortfolioOverviewFeature.inject(dashboardWidgetsSlot, {
  order: 0,
  render: PortfolioOverviewWidget,
});
