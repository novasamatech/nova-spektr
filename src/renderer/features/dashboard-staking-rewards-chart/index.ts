import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardStakingSlot } from '@/pages/Dashboard';

import { RewardsChartWidget } from './ui/RewardsChartWidget';

export const dashboardStakingRewardsChartFeature = createFeature({
  name: 'dashboard/staking-rewards-chart',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

dashboardStakingRewardsChartFeature.inject(dashboardStakingSlot, {
  // Spaced by ten — see `dashboard-staking-positions`.
  order: 20,
  render: RewardsChartWidget,
});
