import { Suspense, lazy } from 'react';

// DI slots call `render(props)` directly, so the value passed to `feature.inject`
// must be a plain function component — not a `lazy()` exotic. This wrapper is
// callable and keeps the modal's heavy transitive imports off the load-time
// path of the `@/features/drafts` barrel.
const CreateDraftModalLazy = lazy(() => import('./CreateDraftModal').then((m) => ({ default: m.CreateDraftModal })));

export const CreateDraftModalSlot = () => (
  <Suspense fallback={null}>
    <CreateDraftModalLazy />
  </Suspense>
);
