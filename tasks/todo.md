# SPEK-249: Draft Operations

## Completed
- [x] Draft CRUD (create, read, update description, delete)
- [x] Submit draft flow (CONFIRM → SIGN → SUBMIT)
- [x] ExtrinsicBuilder integration for call data input on create
- [x] Post-submit: create backend Operation + delete draft
- [x] Permission checks (READ, WRITE, DELETE)
- [x] Migrate to query resource pattern (`draftsResource` + `useDrafts`)
- [x] i18n keys for all UI text

## TODO
- [ ] **Edit call data on existing drafts** — current edit modal only allows description changes. Should support editing callData via paste input or ExtrinsicBuilder (same tabs as create flow). Draft creation without callData must remain supported.
- [ ] **Integrate templates into drafts** — same pattern as call-data-execute (`CallDataForm.tsx`): paste/build tabs with `ExtrinsicBuilder`, decoded args preview via `JsonArgs`, fee display. Apply to both create and edit flows so drafts match the call-data-execute UX. Reference: `features/call-data-execute/ui/CallDataForm.tsx`.
- [ ] Improve post-submit atomicity — handle partial failures in createDescription + deleteDraft sequence
- [ ] Surface call data decode errors to user (currently silent catch)
- [ ] Surface wrapped extrinsic creation failures in confirm step
