import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardStakingSlot } from '@/pages/Dashboard';

import { dashboardStakingKpiActions } from './model/actions';
import { StakingKpiRow } from './ui/StakingKpiRow';

export type {
  ClaimRequestPayload,
  RedeemRequestPayload,
  StakingKpiAction,
  UnbondRequestPayload,
} from './model/actions';
export { dashboardStakingKpiActions };

export const dashboardStakingKpiFeature = createFeature({
  name: 'dashboard/staking-kpi',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

dashboardStakingKpiFeature.inject(dashboardStakingSlot, {
  order: 0,
  render: StakingKpiRow,
});
