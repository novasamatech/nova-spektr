import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardStakingSlot } from '@/pages/Dashboard';

import { dashboardStakingKpiActions } from './model/actions';
import { ApyWidget } from './ui/ApyWidget';
import { NominationsWidget } from './ui/NominationsWidget';
import { RewardsTableWidget } from './ui/RewardsTableWidget';
import { RewardsWidget } from './ui/RewardsWidget';
import { TotalStakedWidget } from './ui/TotalStakedWidget';

export type {
  ClaimRequestPayload,
  RedeemRequestPayload,
  StakingKpiAction,
  UnbondRequestPayload,
} from './model/actions';
export { dashboardStakingKpiActions };

const enable = $features.map(({ dashboard }) => dashboard);

/**
 * Four features, not one.
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

export const dashboardStakingNominationsFeature = createFeature({
  name: 'dashboard/staking-nominations',
  input: createStore({}),
  enable,
});

export const dashboardStakingRewardsFeature = createFeature({
  name: 'dashboard/staking-rewards',
  input: createStore({}),
  enable,
});

/**
 * Rewards seen from the account rather than from the validator — a full-width
 * table, so its own feature: it belongs below the cards, not between them.
 */
export const dashboardStakingRewardsTableFeature = createFeature({
  name: 'dashboard/staking-rewards-table',
  input: createStore({}),
  enable,
});

// A KPI card is one figure with a subline — extra height would only add blank
// card, so growth is capped at double width and the default height.
const KPI_SIZE = { defaultSize: { w: 1, h: 2 }, minSize: { w: 1, h: 2 }, maxSize: { w: 2, h: 2 } };

dashboardStakingTotalStakedFeature.inject(dashboardStakingSlot, { order: 0, render: TotalStakedWidget, ...KPI_SIZE });
dashboardStakingApyFeature.inject(dashboardStakingSlot, { order: 1, render: ApyWidget, ...KPI_SIZE });
dashboardStakingNominationsFeature.inject(dashboardStakingSlot, { order: 2, render: NominationsWidget, ...KPI_SIZE });
dashboardStakingRewardsFeature.inject(dashboardStakingSlot, { order: 3, render: RewardsWidget, ...KPI_SIZE });
dashboardStakingRewardsTableFeature.inject(dashboardStakingSlot, {
  // Below the positions table (10), above the chart (20) — orders on this tab
  // are spaced by ten, see `dashboard-staking-positions`.
  order: 15,
  render: RewardsTableWidget,
  // A table sized like the other full-width ones on this tab.
  defaultSize: { w: 4, h: 5 },
  minSize: { w: 2, h: 3 },
});
