import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { KPI_SIZE } from '@/features/dashboard-staking-kpi';
import { dashboardStakingSlot, defineWidget } from '@/pages/Dashboard';

import { MinStakeKpiWidget } from './ui/MinStakeKpiWidget';

export const dashboardStakingMinStakeFeature = createFeature({
  name: 'dashboard/staking-min-stake',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

// Third card of the KPI row — the slot "Nominated validators" used to hold;
// see `dashboard-staking-kpi` for why each card is its own feature.
dashboardStakingMinStakeFeature.inject(
  dashboardStakingSlot,
  defineWidget({
    order: 2,
    label: 'dashboard.staking.minStake.title',
    render: MinStakeKpiWidget,
    ...KPI_SIZE,
  }),
);
