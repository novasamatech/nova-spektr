import { ErrorBoundary } from 'react-error-boundary';

import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { stakingDashboardActions } from './model/instance';
import { DraftCreatedToast } from './ui/DraftCreatedToast';

export type { DraftToastContext, DraftToastOperation } from './model/draft-toast';
export { draftToast, stakingDashboardActions } from './model/instance';

export const stakingDashboardActionsFeature = createFeature({
  name: 'staking/dashboard-actions',
});

/**
 * Isolated behind an error boundary because `modalsSlot` has none of its own: a
 * throw while formatting a toast line must not take the app shell down.
 *
 * Plain function component (never `memo`/`lazy`/`forwardRef`) — the slot render
 * system calls it directly as a function.
 */
const DraftCreatedToastIsolated = () => (
  <ErrorBoundary fallback={null}>
    <DraftCreatedToast />
  </ErrorBoundary>
);

stakingDashboardActionsFeature.inject(modalsSlot, DraftCreatedToastIsolated);

/**
 * Announce which buttons now have a destination.
 *
 * At module load rather than on feature start: the dashboard renders its chips
 * from these stores, and a chip that flickers from disabled to enabled reads as
 * a bug. Only the genuinely routed actions are announced — see the spec.
 */
stakingDashboardActions.wire();
