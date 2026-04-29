## TODO

## Extract signing-path into its own feature

Goal: pull the signing-path picker out of `features/drafts` into a standalone
`features/signing-path` so it can be reused (next consumer: edit flexible
multisig). PathNode stays in `domains/backend` (it's part of the Draft API
contract). i18n keys stay under `operations.drafts.signingPath.*` for now —
rename is a follow-up.

### Plan
- [x] Create `src/renderer/features/signing-path/` skeleton (`model/`, `lib/`, `ui/`, `index.ts`)
- [x] Move `model/path-model.ts` (+ test) into the new feature
- [x] Move `model/graph-model.ts` (+ test) into the new feature
- [x] Move `lib/path-validation.ts` (+ test) into the new feature
- [x] Move all UI components from `components/signing-path/` → `ui/` (PathBreadcrumb, PathReviewPopover, NextOptionRow + test, SectionCard, EllipsisCard, PathArrow, PathCard, path-views)
- [x] Move `steps/StepPath.tsx` → `ui/StepPath.tsx`
- [x] Move `components/signing-path/StepIndicator.tsx` → `components/StepIndicator.tsx` (drafts-specific, not signing-path)
- [x] Fix relative imports inside moved files
- [x] Add `index.ts` barrel: pathModel, graphModel (+ types), validation utils, StepPath, PathBreadcrumb, PathReviewPopover
- [x] Update consumers in `features/drafts/`: CreateDraftModal, DraftRow, StepReview, SubmitDraftModal, create-draft-model
- [x] Verify: `pnpm types:go`, `pnpm lint`, `pnpm test` (1409 tests pass; 0 lint errors in affected dirs)

### Review
- All file moves done with `git mv` to preserve history.
- The auto-reset of `pathModel` on chain change / modal close stays in `create-draft-model` — it's drafts-specific behaviour, not signing-path's concern. Future consumers (edit flexible) decide for themselves.
- `graphModel.cachesCleared` stays public; consumer drives lifecycle.
- `PathNode` stays in `@/domains/backend` — it's part of the Draft API contract.
- StepIndicator was misfiled in `components/signing-path/`; moved to `components/` because it knows about `Step` from `create-draft-model`.

### Done in follow-up PRs
- [x] **i18n rename** — moved `operations.drafts.signingPath.*` → top-level `signingPath.*`; also relocated `multisigsGroup`/`proxiedAccountsGroup` from `operations.drafts.*` since they're consumed only by signing-path.
- [x] **Wire signing-path into flexible-change-signatories** — added new `SIGNING_PATH` step between `SELECT_CONTROLLER` and `CONFIRM`. Path is auto-seeded with `[proxied(flexible.accountId), multisig(flexible.multisigAccountId)]`; user picks the signer leaf; the path leaf resolves `$signer` via `accounts.$list` lookup. Replaced the auto-pick fallback. Added `lockedSourceCount` prop to `StepPath` so the breadcrumb doesn't allow truncating past the seeded source. Relaxed `pathSeeded` to accept valid prefixes (added `isValidPathPrefix`). Integration test updated to walk the new flow.

## Feedback
- [ ] **UI text polish** — Some text is inconsistent / not finalized (Storybook was for flow demo only). Review all user-facing strings and align with app conventions.
- [ ] **General UI polish** — Review the drafts UI to match the rest of the app's look & feel. Consider using the UI/UX prototype skill for reference.
