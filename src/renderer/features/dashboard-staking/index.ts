import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardStakingSlot, dashboardWidgetsSlot } from '@/pages/Dashboard';

import { MonthlyRewardsWidget } from './ui/MonthlyRewardsWidget';
import { StakingOverviewWidget } from './ui/StakingOverviewWidget';
import { StakingSummaryWidget } from './ui/StakingSummaryWidget';
import { TotalRewardsWidget } from './ui/TotalRewardsWidget';

const enableFlag = $features.map(({ dashboard }) => dashboard);

export const dashboardStakingFeature = createFeature({
  name: 'dashboard/staking',
  input: createStore({}),
  enable: enableFlag,
});

export const dashboardTotalRewardsFeature = createFeature({
  name: 'dashboard/total-rewards',
  input: createStore({}),
  enable: enableFlag,
});

export const dashboardStakingSummaryFeature = createFeature({
  name: 'dashboard/staking-summary',
  input: createStore({}),
  enable: enableFlag,
});

export const dashboardMonthlyRewardsFeature = createFeature({
  name: 'dashboard/monthly-rewards',
  input: createStore({}),
  enable: enableFlag,
});

dashboardStakingFeature.inject(dashboardStakingSlot, {
  order: 0,
  render: StakingOverviewWidget,
  defaultSize: { w: 2, h: 5 },
  minSize: { w: 2, h: 2 },
});

dashboardTotalRewardsFeature.inject(dashboardStakingSlot, {
  order: 1,
  render: TotalRewardsWidget,
  defaultSize: { w: 2, h: 5 },
  minSize: { w: 2, h: 2 },
});

dashboardStakingSummaryFeature.inject(dashboardWidgetsSlot, {
  order: 2,
  render: StakingSummaryWidget,
  defaultSize: { w: 2, h: 3 },
  minSize: { w: 1, h: 2 },
});

dashboardMonthlyRewardsFeature.inject(dashboardStakingSlot, {
  order: 2,
  render: MonthlyRewardsWidget,
  defaultSize: { w: 4, h: 5 },
  minSize: { w: 2, h: 3 },
});
