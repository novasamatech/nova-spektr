import { ErrorBoundary } from 'react-error-boundary';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { payeeFlowModel } from './model/payee-flow';
import { PayeeFlow } from './ui/PayeeFlow';

export type { PayeeFlowTarget, PayeeOption } from './types';

export const stakingPayeeFlowFeature = createFeature({
  name: 'staking/payee-flow',
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
const PayeeFlowIsolated = () => (
  <ErrorBoundary fallback={null}>
    <PayeeFlow />
  </ErrorBoundary>
);

stakingPayeeFlowFeature.inject(modalsSlot, PayeeFlowIsolated);

/**
 * What the host wires the dashboard button to.
 *
 * `changeRewardDestinationRequested` takes a structural subset of the
 * dashboard's `PositionActionPayload`, so it can be a `sample` target with no
 * mapping in between. `flowCompleted` fires once per landed extrinsic.
 */
export const stakingPayeeFlow = {
  $step: payeeFlowModel.$step,

  /** What a host needs to describe the operation it just handed over. */
  $chain: payeeFlowModel.$chain,
  $asset: payeeFlowModel.$asset,
  $initiator: payeeFlowModel.$initiator,
  $wallet: payeeFlowModel.$wallet,
  $isDraftMode: payeeFlowModel.$isDraftMode,
  $initiatedDraft: payeeFlowModel.$initiatedDraft,
  $draftSigningPath: payeeFlowModel.$draftSigningPath,
  saveAsDraftRequested: payeeFlowModel.saveAsDraftRequested,
  flowStarted: payeeFlowModel.flowStarted,

  changeRewardDestinationRequested: payeeFlowModel.changeRewardDestinationRequested,
  flowCompleted: payeeFlowModel.flowCompleted,
};
