import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardStakingSlot } from '@/pages/Dashboard';

import { StakingOverviewWidget } from './ui/StakingOverviewWidget';
import { TotalRewardsWidget } from './ui/TotalRewardsWidget';

const enableFlag = $features.map(({ dashboard }) => dashboard);

export const dashboardStakingOverviewFeature = createFeature({
  name: 'dashboard/staking-overview',
  input: createStore({}),
  enable: enableFlag,
});

export const dashboardTotalRewardsFeature = createFeature({
  name: 'dashboard/total-rewards',
  input: createStore({}),
  enable: enableFlag,
});

dashboardStakingOverviewFeature.inject(dashboardStakingSlot, {
  order: 0,
  render: StakingOverviewWidget,
});

dashboardTotalRewardsFeature.inject(dashboardStakingSlot, {
  order: 1,
  render: TotalRewardsWidget,
});
