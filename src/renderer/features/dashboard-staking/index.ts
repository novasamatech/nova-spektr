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
 *
 * **Only `StakingSummaryWidget` is live.** It reaches `Price` and
 * `useStakingOverview` (which reaches `useActiveValidatorCount`); those four
 * modules are the whole reachable graph of this feature.
 *
 * Everything else is the pre-rework Staking tab, kept deliberately and marked
 * `@deprecated` rather than deleted: `StakingOverviewWidget`,
 * `TotalRewardsWidget` and `MonthlyRewardsWidget` (the three widgets this
 * feature used to inject into `dashboardStakingSlot`), their detail modals,
 * `ChainAllocationChart`, `ChartTooltip`, and the hooks reachable only from
 * them. Each carries a pointer to what replaced it.
 *
 * **Delete the deprecated set once the staking tab migration is complete** —
 * i.e. once nothing in the new widgets is still owed to it (per-chain
 * allocation, the nominated-validator list). Until then they are the reference
 * for behaviour the rework has not reproduced yet.
 */
export const dashboardStakingSummaryFeature = createFeature({
  name: 'dashboard/staking-summary',
  input: createStore({}),
  enable: enableFlag,
});

dashboardStakingSummaryFeature.inject(dashboardWidgetsSlot, {
  order: 2,
  render: StakingSummaryWidget,
  defaultSize: { w: 2, h: 3 },
  minSize: { w: 1, h: 2 },
});
