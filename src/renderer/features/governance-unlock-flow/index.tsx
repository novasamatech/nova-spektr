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
 * The boundary also has to close the flow, not just hide it. Unmounting the UI
 * leaves the model where it was: a throw while `$step` is SIGN keeps it there
 * with no modal to leave it, and the next app-wide `signModel.signed` — from
 * any other operation — would be claimed and submitted as this flow's own.
 * `flowFinished` returns the model to NONE so the invisible flow can't.
 *
 * Plain function component, never `memo`/`lazy`/`forwardRef`: the slot render
 * system calls it directly as a function.
 */
const UnlockFlowIsolated = () => (
  <ErrorBoundary
    fallback={null}
    onError={(error) => {
      console.error('[governance-unlock-flow] render failed, closing the flow', error);
      unlockFlowModel.flowFinished();
    }}
  >
    <UnlockFlow />
  </ErrorBoundary>
);

governanceUnlockFlowFeature.inject(modalsSlot, UnlockFlowIsolated);

/**
 * What a host wires a lock row's Unlock button to. Nothing comes back: the
 * dashboard's rows are derived from live voting and lock subscriptions, so they
 * update on their own once the extrinsic lands.
 */
export const governanceUnlockFlow = {
  unlockRequested: unlockFlowModel.unlockRequested,
};
