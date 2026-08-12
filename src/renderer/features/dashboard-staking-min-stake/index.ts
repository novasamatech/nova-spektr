import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardStakingSlot } from '@/pages/Dashboard';

import { MinStakeWidget } from './ui/MinStakeWidget';

export const dashboardStakingMinStakeFeature = createFeature({
  name: 'dashboard/staking-min-stake',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

dashboardStakingMinStakeFeature.inject(dashboardStakingSlot, {
  // Spaced by ten — see `dashboard-staking-positions`.
  order: 30,
  render: MinStakeWidget,
  defaultSize: { w: 2, h: 5 },
  minSize: { w: 2, h: 4 },
});
