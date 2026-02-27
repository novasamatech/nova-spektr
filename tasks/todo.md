# SPEK-155: Address Book UX/UI Improvements

## Sub-issues (12 total, each gets its own branch)

### Phase 1: Foundation & Cleanup (do first — other tasks depend on these)
- [ ] **SPEK-168** — Cleanup: extract inline components + remove orphaned i18n keys
  - Branch: `fix/SPEK-168-cleanup-inline-components`
  - Extract `ContactSkeleton`, `LoadingView`, `ErrorView`, `EmptyBackendView` from Contacts.tsx
  - Remove unused i18n keys (keep ones needed by other subtasks)
  - Write UI test for extracted components

- [ ] **SPEK-156** — Replace custom skeletons with shared Skeleton component
  - Branch: `fix/SPEK-156-shared-skeleton`
  - Rewrite ContactSkeleton using `<Skeleton>` from `@/shared/ui-kit`
  - Write UI test showing skeleton loading state

- [ ] **SPEK-157** — Replace custom ErrorView with Alert component
  - Branch: `fix/SPEK-157-alert-error-view`
  - Use `Alert variant="error"` + retry Button
  - Map error types to user-friendly messages
  - Write UI test showing error state

- [ ] **SPEK-158** — Align EmptyBackendView with shared empty state pattern
  - Branch: `fix/SPEK-158-empty-backend-view`
  - Use `Graphics name="emptyList"` or `EmptyMessage` pattern
  - Add contextual guidance text
  - Write UI test showing empty backend state

### Phase 2: Accessibility
- [ ] **SPEK-159** — Add accessibility improvements
  - Branch: `fix/SPEK-159-accessibility`
  - Add aria-labels to all IconButtons (ContactRow, BackendContactRow, Contacts)
  - Add aria-label to BackendConnectionCard button
  - Add aria-live region for dynamic content
  - Add aria-busy + sr-only text to loading state
  - Write UI test verifying aria attributes

### Phase 3: Backend UX Enhancements
- [ ] **SPEK-160** — Implement SyncStatusBadge with last sync time
  - Branch: `fix/SPEK-160-sync-status-badge`
  - Add `$lastSyncTime` and `$syncStatus` stores
  - Create `SyncStatusBadge` component
  - Replace bare refresh IconButton
  - Write UI test showing sync states

- [ ] **SPEK-165** — Add read-only visual indicator on backend contacts
  - Branch: `fix/SPEK-165-readonly-indicator`
  - Add lock icon + "Synced" label to BackendContactRow
  - Add tooltip explaining read-only nature
  - Write UI test showing the indicator

- [ ] **SPEK-167** — Improve disconnected state visibility + sync tooltip
  - Branch: `fix/SPEK-167-disconnected-state`
  - Make BackendConnectionCard disconnected state more prominent
  - Add tooltip to sync button
  - Write UI test showing disconnected vs connected states

### Phase 4: Advanced Features
- [ ] **SPEK-162** — Add session expiry awareness and recovery UX
  - Branch: `fix/SPEK-162-session-expiry`
  - Periodic session health check
  - Non-blocking "Session expired — Reconnect" banner
  - Update BackendConnectionCard for expired session
  - Write UI test showing session states

- [ ] **SPEK-163** — Add backend URL reachability check ("Test Connection")
  - Branch: `fix/SPEK-163-test-connection`
  - Debounced health check on URL input
  - Inline green checkmark / red X
  - Write UI test showing connection check states

- [ ] **SPEK-164** — Add backend configuration section to Settings page
  - Branch: `fix/SPEK-164-settings-backend`
  - Add "Address Book Sync" section to Settings Overview
  - Show current backend status with link to modal
  - Write UI test showing the settings section

- [ ] **SPEK-166** — Show cached contacts on error + stale data indicator
  - Branch: `fix/SPEK-166-cached-contacts`
  - Show cached contacts with warning banner on sync error
  - Stale data indicator when last sync is old
  - Write UI test showing stale/cached states
