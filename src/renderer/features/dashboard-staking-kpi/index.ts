import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardStakingSlot, defineWidget } from '@/pages/Dashboard';

import { KPI_SIZE } from './lib/kpi-size';
import { dashboardStakingKpiActions } from './model/actions';
import { ApyWidget } from './ui/ApyWidget';
import { RewardsWidget } from './ui/RewardsWidget';
import { TotalStakedWidget } from './ui/TotalStakedWidget';

export type {
  ClaimRequestPayload,
  RedeemRequestPayload,
  StakingKpiAction,
  UnbondRequestPayload,
} from './model/actions';
export { dashboardStakingKpiActions };
export { KpiCard } from './ui/KpiCard';
export { KpiWidgetFrame, NoSelectionCard } from './ui/KpiWidgetFrame';
export { KPI_SIZE } from './lib/kpi-size';
export { csvFileName } from './lib/csv';

const enable = $features.map(({ dashboard }) => dashboard);

/**
 * Three features, not one (the fourth card of the row, the network-level "Min
 * stake to enter the active set", is `dashboard-staking-min-stake`).
 *
 * DI keys a slot registration as `feature: ${name}` and the dashboard stores
 * its layout by that key, so a card can only be moved on its own if it is its
 * own feature. They share one data hook: every card assembles the same figures
 * from the same stores, so a card and its drill-down can never disagree.
 *
 * Orders 0–3 keep the four together at the top of the tab; the widgets below
 * them are spaced by ten, so nothing of theirs lands between two cards.
 */
export const dashboardStakingTotalStakedFeature = createFeature({
  name: 'dashboard/staking-total-staked',
  input: createStore({}),
  enable,
});

export const dashboardStakingApyFeature = createFeature({
  name: 'dashboard/staking-apy',
  input: createStore({}),
  enable,
});

export const dashboardStakingRewardsFeature = createFeature({
  name: 'dashboard/staking-rewards',
  input: createStore({}),
  enable,
});

dashboardStakingTotalStakedFeature.inject(
  dashboardStakingSlot,
  defineWidget({
    order: 0,
    label: 'dashboard.staking.kpi.totalStaked.title',
    render: TotalStakedWidget,
    ...KPI_SIZE,
  }),
);
dashboardStakingApyFeature.inject(
  dashboardStakingSlot,
  defineWidget({
    order: 1,
    label: 'dashboard.staking.kpi.apy.title',
    render: ApyWidget,
    ...KPI_SIZE,
  }),
);
dashboardStakingRewardsFeature.inject(
  dashboardStakingSlot,
  defineWidget({
    order: 3,
    label: 'dashboard.staking.kpi.rewards.title',
    render: RewardsWidget,
    ...KPI_SIZE,
  }),
);
