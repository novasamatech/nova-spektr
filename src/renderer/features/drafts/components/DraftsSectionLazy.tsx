import { Suspense, lazy } from 'react';

// Keeps DraftsSection's heavy transitive chain (SubmitDraftModal → wallet-details
// → flexible-change-signatories → drafts barrel) off the load-time path of
// `@/features/drafts`, which form-models import for `createDraftModeBinding`.
const DraftsSectionLazy = lazy(() => import('./DraftsSection').then((m) => ({ default: m.DraftsSection })));

export const DraftsSection = () => (
  <Suspense fallback={null}>
    <DraftsSectionLazy />
  </Suspense>
);
