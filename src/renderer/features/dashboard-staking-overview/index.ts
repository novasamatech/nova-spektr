import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardStakingSlot } from '@/pages/Dashboard';

import { StakingOverviewWidget } from './ui/StakingOverviewWidget';

export const dashboardStakingOverviewFeature = createFeature({
  name: 'dashboard/staking-overview',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

dashboardStakingOverviewFeature.inject(dashboardStakingSlot, {
  order: 0,
  render: StakingOverviewWidget,
});
