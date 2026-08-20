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
  defaultSize: { w: 4, h: 5 },
  // The card does not scroll, so this is also the floor of the plot itself:
  // three rows leave it about 150px, which is the least a labelled bar chart
  // stays readable at, and two columns the least the header fits in.
  minSize: { w: 2, h: 3 },
});
