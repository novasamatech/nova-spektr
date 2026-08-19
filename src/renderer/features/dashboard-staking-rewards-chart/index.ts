import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardStakingSlot, defineWidget } from '@/pages/Dashboard';

import { RewardsChartWidget } from './ui/RewardsChartWidget';

export const dashboardStakingRewardsChartFeature = createFeature({
  name: 'dashboard/staking-rewards-chart',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

dashboardStakingRewardsChartFeature.inject(
  dashboardStakingSlot,
  defineWidget({
    // Spaced by ten — see `dashboard-staking-positions`.
    order: 20,
    // The card reads "Rewards", same as the rewards KPI card; the restore
    // list needs the two to be tellable apart.
    label: 'dashboard.staking.rewardsChart.widgetName',
    render: RewardsChartWidget,
    defaultSize: { w: 4, h: 5 },
    // Nothing scrolls here, so this is also the plot's floor: three rows leave it
    // ~150px, two columns fit the header.
    minSize: { w: 2, h: 3 },
  }),
);
