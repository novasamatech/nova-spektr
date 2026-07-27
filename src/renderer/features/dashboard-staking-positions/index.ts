import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardStakingSlot } from '@/pages/Dashboard';

import { PositionsWidget } from './ui/PositionsWidget';

export type { MultisigThreshold, PositionAccessMode, PositionRow } from './lib';
export { canAct, getAccessMode, getMultisigThreshold } from './lib';
export type { ClaimPayload, NominationsChangePayload, PositionActionPayload } from './model/position-actions';
export { positionActions } from './model/position-actions';
export { usePositionRows } from './hooks/usePositionRows';

export const dashboardStakingPositionsFeature = createFeature({
  name: 'dashboard/staking-positions',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

dashboardStakingPositionsFeature.inject(dashboardStakingSlot, {
  order: 1,
  render: PositionsWidget,
});
