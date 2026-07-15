import { Suspense, lazy } from 'react';

import { type DraftListScope } from '../lib/draft-scope';

// Keeps DraftsSection's heavy transitive chain (SubmitDraftModal → wallet-details
// → flexible-change-signatories → drafts barrel) off the load-time path of
// `@/features/drafts`, which form-models import for `createDraftModeBinding`.
const DraftsSectionLazy = lazy(() => import('./DraftsSection').then((m) => ({ default: m.DraftsSection })));

export const DraftsSection = ({ scope }: { scope?: DraftListScope }) => (
  <Suspense fallback={null}>
    <DraftsSectionLazy scope={scope} />
  </Suspense>
);
