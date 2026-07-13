import { ErrorBoundary } from 'react-error-boundary';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { portfolioVestingSlot } from '@/features/dashboard-portfolio-overview';

import { VestingRoot } from './ui/VestingRoot';

export const vestingClaimFeature = createFeature({
  name: 'vesting/claim',
  enable: $features.map(({ vestingClaim }) => vestingClaim),
});

// Self-contained injection: the vesting callout renders inside the Portfolio
// Overview card via a shared slot that has no error boundary of its own, so any
// throw here would take the whole widget down with it. Isolate it — on failure
// the callout simply renders nothing and Portfolio Overview stays intact.
// Plain function component (not memo/lazy) — the slot render system calls it directly.
const VestingRootIsolated = (props: { accountIds: string[] }) => (
  <ErrorBoundary fallback={null}>
    <VestingRoot {...props} />
  </ErrorBoundary>
);

vestingClaimFeature.inject(portfolioVestingSlot, {
  order: 0,
  render: VestingRootIsolated,
});
