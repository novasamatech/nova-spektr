import { useUnit } from 'effector-react';
import { ErrorBoundary } from 'react-error-boundary';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { unlockFlowModel } from './model/unlock-flow';
import { UnlockFlow } from './ui/UnlockFlow';

export type { UnlockRequest } from './types';

export const governanceUnlockFlowFeature = createFeature({
  name: 'governance/unlock-flow',
  enable: $features.map(({ dashboard, governance }) => dashboard && governance),
});

/**
 * Globally mounted: the flow is opened by an event, not by navigation, so it
 * has to be alive wherever the dashboard is. Isolated behind an error boundary
 * because `modalsSlot` has none of its own — a throw here would otherwise take
 * the whole shell down.
 *
 * A crash has to **close** the flow, not just hide it. Unmounting the UI leaves
 * the model where it was: a throw while `$step` is SIGN keeps it there with no
 * modal to leave it, and the next app-wide `signModel.signed` — from any other
 * operation — would be claimed and submitted as this flow's own.
 *
 * And the boundary itself has to let go. It latches on the first throw and
 * clears only on `resetErrorBoundary()` or a changed `resetKeys`; with neither,
 * one crash would blank the flow for the rest of the session while the model
 * still walked to CONFIRM on every later click — invisible and unclosable.
 * Keying the reset on `$step` ties the two together: crash → `flowFinished` →
 * step NONE → keys change → the boundary resets → `UnlockFlow` renders again
 * and, at NONE, renders nothing. Stable rather than looping, because the step
 * it resets into is the one with nothing to draw. (A crash that leaves the step
 * unchanged keeps the boundary latched until the next request moves it — which
 * is exactly when the UI is needed again.)
 *
 * Hooks are fine here: `shared/di/createSlot.tsx` renders the injected function
 * as a real component. Only `memo`/`lazy`/`forwardRef` are forbidden.
 */
const UnlockFlowIsolated = () => {
  const step = useUnit(unlockFlowModel.$step);
  const finishFlow = useUnit(unlockFlowModel.flowFinished);

  return (
    <ErrorBoundary
      fallback={null}
      resetKeys={[step]}
      onError={(error) => {
        console.error('[governance-unlock-flow] render failed, closing the flow', error);
        finishFlow();
      }}
    >
      <UnlockFlow />
    </ErrorBoundary>
  );
};

governanceUnlockFlowFeature.inject(modalsSlot, UnlockFlowIsolated);

/**
 * What a host wires a lock row's Unlock button to. Nothing comes back: the
 * dashboard's rows are derived from live voting and lock subscriptions, so they
 * update on their own once the extrinsic lands.
 */
export const governanceUnlockFlow = {
  unlockRequested: unlockFlowModel.unlockRequested,
};
