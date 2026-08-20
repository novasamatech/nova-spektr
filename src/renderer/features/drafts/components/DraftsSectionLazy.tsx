import { Suspense, lazy } from 'react';

import { type DraftListScope } from '../lib/draft-scope';

// Keeps DraftsSection's heavy transitive chain (SubmitDraftModal → wallet-details
// → flexible-change-signatories → drafts barrel) off the load-time path of
// `@/features/drafts`, which form-models import for `createDraftModeBinding`.
const DraftsSectionLazy = lazy(() => import('./DraftsSection').then((m) => ({ default: m.DraftsSection })));

type Props = { scope?: DraftListScope; isCollapsed: boolean };

export const DraftsSection = ({ scope, isCollapsed }: Props) => (
  <Suspense fallback={null}>
    <DraftsSectionLazy scope={scope} isCollapsed={isCollapsed} />
  </Suspense>
);
