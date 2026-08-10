import { createStore } from 'effector';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { dashboardStakingSlot } from '@/pages/Dashboard';

import { PositionsWidget } from './ui/PositionsWidget';

export type { CountdownParts, MultisigThreshold, PositionAccessMode, PositionRow } from './lib';
export { canAct, getAccessMode, getCountdownParts, getMultisigThreshold, getUnbondingCountdown } from './lib';
export type {
  ClaimPayload,
  NominationsChangePayload,
  PositionAction,
  PositionActionPayload,
} from './model/position-actions';
export { positionActions } from './model/position-actions';
export { usePositionRows } from './hooks/usePositionRows';

export const dashboardStakingPositionsFeature = createFeature({
  name: 'dashboard/staking-positions',
  input: createStore({}),
  enable: $features.map(({ dashboard }) => dashboard),
});

// Orders on this tab are spaced by ten: the KPI cards occupy 0–3, and a widget
// that later splits into several needs room to keep them together.
dashboardStakingPositionsFeature.inject(dashboardStakingSlot, {
  order: 10,
  render: PositionsWidget,
});
