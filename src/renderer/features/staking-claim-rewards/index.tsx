import { ErrorBoundary } from 'react-error-boundary';

import { createFeature } from '@/shared/feature';
import { modalsSlot } from '@/features/app-shell';

import { ClaimRewardsFlow } from './ui/ClaimRewardsFlow';

export { claimRewardsModel, claimRewardsUtils } from './model/claim';
export { type ClaimPlan, type ClaimRequest, type ClaimedRewards } from './types';
export {
  buildClaimPlans,
  chunkPayouts,
  countEras,
  countValidators,
  groupRequestsByAccount,
  selectClaimableRequests,
  sumPayouts,
} from './lib/plan';

export const stakingClaimRewardsFeature = createFeature({
  name: 'staking/claim-rewards',
});

// The modal is globally mounted, so a throw inside it would take the whole app
// shell down with it. Isolate it: on failure the flow renders nothing and the
// rest of the app stays usable.
// Plain function component (not memo/lazy) — the slot render system calls it directly.
const ClaimRewardsFlowIsolated = () => (
  <ErrorBoundary fallback={null}>
    <ClaimRewardsFlow />
  </ErrorBoundary>
);

stakingClaimRewardsFeature.inject(modalsSlot, ClaimRewardsFlowIsolated);
