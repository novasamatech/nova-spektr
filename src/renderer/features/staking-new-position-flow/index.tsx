import { ErrorBoundary } from 'react-error-boundary';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { newPositionFlowModel } from './model/new-position-flow';
import { NewPositionFlow } from './ui/NewPositionFlow';

export { Step as NewPositionStep } from './types';

export const stakingNewPositionFlowFeature = createFeature({
  name: 'staking/new-position-flow',
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
const NewPositionFlowIsolated = () => (
  <ErrorBoundary fallback={null}>
    <NewPositionFlow />
  </ErrorBoundary>
);

stakingNewPositionFlowFeature.inject(modalsSlot, NewPositionFlowIsolated);

/**
 * What the host wires the dashboard's "New position" button to.
 *
 * `newPositionRequested` takes nothing: the button carries no account, and the
 * flow asks for chain and account itself. `flowCompleted` fires once per landed
 * extrinsic.
 */
export const stakingNewPositionFlow = {
  $step: newPositionFlowModel.$step,
  $chain: newPositionFlowModel.$chain,
  $asset: newPositionFlowModel.$asset,
  $initiator: newPositionFlowModel.$initiator,
  $wallet: newPositionFlowModel.$wallet,
  $amountPlanck: newPositionFlowModel.$amountPlanck,
  $isDraftMode: newPositionFlowModel.$isDraftMode,
  $initiatedDraft: newPositionFlowModel.$initiatedDraft,
  $draftSigningPath: newPositionFlowModel.$draftSigningPath,
  saveAsDraftRequested: newPositionFlowModel.saveAsDraftRequested,

  newPositionRequested: newPositionFlowModel.newPositionRequested,
  flowCompleted: newPositionFlowModel.flowCompleted,
};
