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
 * Plain function component, never `memo`/`lazy`/`forwardRef`: the slot render
 * system calls it directly as a function.
 */
const UnlockFlowIsolated = () => (
  <ErrorBoundary fallback={null}>
    <UnlockFlow />
  </ErrorBoundary>
);

governanceUnlockFlowFeature.inject(modalsSlot, UnlockFlowIsolated);

/**
 * What a host wires a lock row's Unlock button to. `flowCompleted` fires once
 * per landed extrinsic.
 */
export const governanceUnlockFlow = {
  $step: unlockFlowModel.$step,

  unlockRequested: unlockFlowModel.unlockRequested,
  flowCompleted: unlockFlowModel.flowCompleted,
};
