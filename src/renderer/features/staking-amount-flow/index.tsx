import { ErrorBoundary } from 'react-error-boundary';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { amountFlowModel } from './model/amount-flow';
import { AmountFlow } from './ui/AmountFlow';

export type { AmountFlowMode, AmountFlowTarget } from './types';

export const stakingAmountFlowFeature = createFeature({
  name: 'staking/amount-flow',
  enable: $features.map(({ staking }) => staking),
});

/**
 * Globally mounted: the flow is opened by an event, not by navigation, so it
 * has to be alive wherever the dashboard is. Isolated behind an error boundary
 * because `modalsSlot` has none of its own — a throw here would otherwise take
 * the whole shell down.
 *
 * Plain function component, never `memo`/`lazy`/`forwardRef`: the slot render
 * system calls it directly as a function.
 */
const AmountFlowIsolated = () => (
  <ErrorBoundary fallback={null}>
    <AmountFlow />
  </ErrorBoundary>
);

stakingAmountFlowFeature.inject(modalsSlot, AmountFlowIsolated);

/**
 * What the host wires the dashboard buttons to.
 *
 * `unbondRequested` / `addStakeRequested` take a structural subset of the
 * dashboard's `PositionActionPayload`, so they can be a `sample` target with no
 * mapping in between. `flowCompleted` fires once per landed extrinsic.
 */
export const stakingAmountFlow = {
  $step: amountFlowModel.$step,

  /** What a host needs to describe the operation it just handed over. */
  $mode: amountFlowModel.$mode,
  $chain: amountFlowModel.$chain,
  $asset: amountFlowModel.$asset,
  $amountPlanck: amountFlowModel.$amountPlanck,
  $initiator: amountFlowModel.$initiator,
  $wallet: amountFlowModel.$wallet,
  $isDraftMode: amountFlowModel.$isDraftMode,
  $initiatedDraft: amountFlowModel.$initiatedDraft,
  $draftSigningPath: amountFlowModel.$draftSigningPath,
  saveAsDraftRequested: amountFlowModel.saveAsDraftRequested,
  flowStarted: amountFlowModel.flowStarted,

  unbondRequested: amountFlowModel.unbondRequested,
  addStakeRequested: amountFlowModel.addStakeRequested,
  flowCompleted: amountFlowModel.flowCompleted,
};
