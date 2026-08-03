import { ErrorBoundary } from 'react-error-boundary';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { confirmFlowModel } from './model/confirm-flow';
import { ConfirmFlow } from './ui/ConfirmFlow';

export type { ChangeValidatorsTarget, ConfirmFlowMode, RedeemTarget } from './types';

export const stakingConfirmFlowFeature = createFeature({
  name: 'staking/confirm-flow',
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
const ConfirmFlowIsolated = () => (
  <ErrorBoundary fallback={null}>
    <ConfirmFlow />
  </ErrorBoundary>
);

stakingConfirmFlowFeature.inject(modalsSlot, ConfirmFlowIsolated);

/**
 * What the host wires the dashboard buttons to.
 *
 * `changeValidatorsRequested` takes a structural subset of the dashboard's
 * `NominationsChangePayload`, so it can be a `sample` target with no mapping in
 * between. `flowCompleted` fires once per landed extrinsic.
 */
export const stakingConfirmFlow = {
  $step: confirmFlowModel.$step,

  /** What a host needs to describe the operation it just handed over. */
  $mode: confirmFlowModel.$mode,
  $chain: confirmFlowModel.$chain,
  $asset: confirmFlowModel.$asset,
  $amount: confirmFlowModel.$amount,
  $initiator: confirmFlowModel.$initiator,
  $wallet: confirmFlowModel.$wallet,
  $isDraftMode: confirmFlowModel.$isDraftMode,
  $initiatedDraft: confirmFlowModel.$initiatedDraft,
  $draftSigningPath: confirmFlowModel.$draftSigningPath,
  saveAsDraftRequested: confirmFlowModel.saveAsDraftRequested,
  flowStarted: confirmFlowModel.flowStarted,

  changeValidatorsRequested: confirmFlowModel.changeValidatorsRequested,
  redeemRequested: confirmFlowModel.redeemRequested,
  flowCompleted: confirmFlowModel.flowCompleted,
};
