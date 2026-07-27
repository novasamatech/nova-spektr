import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardWidgetsSlot } from '@/pages/Dashboard';

import { StakingSummaryWidget } from './ui/StakingSummaryWidget';

const enableFlag = $features.map(({ dashboard }) => dashboard);

/**
 * The Staking tab is served by `dashboard-staking-kpi`,
 * `dashboard-staking-positions` and `dashboard-staking-rewards-chart`. What
 * remains here is the summary card of the Overview tab, which lives in a
 * different slot and is out of that rework's scope.
 */
export const dashboardStakingSummaryFeature = createFeature({
  name: 'dashboard/staking-summary',
  input: createStore({}),
  enable: enableFlag,
});

dashboardStakingSummaryFeature.inject(dashboardWidgetsSlot, {
  order: 2,
  render: StakingSummaryWidget,
});
