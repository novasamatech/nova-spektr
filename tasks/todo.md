# Draft Submit Flow + Backend Operation Creation

## Completed
- [x] Create `submit-draft-model.ts` — Effector model replicating the call-data-execute pipeline
- [x] Create `SubmitDraftModal.tsx` — Modal with CONFIRM → SIGN → SUBMIT steps
- [x] Wire Submit button in `DraftsSection.tsx` with `onSubmit` handler
- [x] Add i18n keys: `submitTitle`, `submitSignatory`, `noCallDataToSubmit`
- [x] Pass `pnpm types:go` — 0 type errors
- [x] Pass lint — 0 errors (only pre-existing warnings)
- [x] Pass formatting — auto-formatted with Prettier

## Files Created
- `src/renderer/features/drafts/model/submit-draft-model.ts`
- `src/renderer/features/drafts/components/SubmitDraftModal.tsx`

## Files Modified
- `src/renderer/features/drafts/components/DraftsSection.tsx`
- `src/renderer/shared/i18n/locales/en.json`

## Architecture Decisions
- Reused shared transaction utilities (`createWrappedTxStore`, `createRouteStore`, `createFeeCalculator`, `createSignatoriesStore`)
- Reused `signModel` and `submitModel` from operations features
- Post-submit: creates backend Operation via `operationsService.createDescription()`, deletes draft via `draftsService.deleteDraft()`
- Updates local caches: `draftsModel.events.draftDeleted` + `operationDescriptionsResource.descriptionCreated`
- Submit button disabled when no callData present (with tooltip explaining why)
