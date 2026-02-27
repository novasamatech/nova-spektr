# SPEK-155 Implementation Plan

## Overview
12 sub-issues for Address Book UX/UI improvements. Each gets its own branch off `dev`, a code fix, and a UI test (Vitest + React Testing Library) that renders the component to demonstrate the fix for screenshot purposes.

## Execution Order & Dependencies

### Phase 1: SPEK-168 (Cleanup — foundation for other tasks)
**Branch:** `fix/SPEK-168-cleanup-inline-components`

**Changes:**
1. Extract from `Contacts.tsx` into separate files:
   - `entities/contact/ui/ContactSkeleton.tsx` — the skeleton component
   - `entities/contact/ui/BackendLoadingView.tsx` — renders 5 skeletons
   - `entities/contact/ui/BackendErrorView.tsx` — error with retry
   - `entities/contact/ui/EmptyBackendView.tsx` — empty state for backend tab
2. Remove orphaned i18n keys from `en.json`:
   - `addressBook.removeConfirm.*` (4 keys)
   - `addressBook.contactList.emptySearchDescription`
   - `addressBook.contactList.noContactsButton`
   - `addressBook.auth.notConnected`, `signOutButton`, `signInSuccess`
   - `addressBook.backendContact.*` (4 keys)
   - `addressBook.actions.edit`
   - Keep: `sources.syncButton`, `sources.loading`, `backendConfiguration.connectingMessage`, `connectionLabel`, `tooltip` (used by later tasks)
3. Update `Contacts.tsx` to import from new locations
4. Update `entities/contact` barrel export

**Test:** `entities/contact/ui/__tests__/BackendErrorView.test.tsx` — renders error view, verifies retry button

---

### Phase 2: SPEK-156 (Shared Skeleton)
**Branch:** `fix/SPEK-156-shared-skeleton`

**Changes:**
1. Rewrite `ContactSkeleton` using `<Skeleton>` from `@/shared/ui-kit`:
   - Circle skeleton for avatar (width=5, circle)
   - Rectangle skeletons for name (width=24, height=3.5)
   - Rectangle skeletons for address (width=40, height=3)
   - Label-shaped skeletons (width=14/20/16, height=5, rounded)
2. Remove `animate-pulse` usage entirely

**Test:** `entities/contact/ui/__tests__/ContactSkeleton.test.tsx` — renders skeleton, verifies `spektr-skeleton` class is used (not `animate-pulse`)

---

### Phase 3: SPEK-157 (Alert Error View)
**Branch:** `fix/SPEK-157-alert-error-view`

**Changes:**
1. Rewrite `BackendErrorView` to use `Alert variant="error"`:
   - Title: user-friendly message based on error type
   - Secondary text: raw error message for debugging
   - Retry `Button` below the alert
2. Add error mapping utility:
   - Network/fetch errors → "Could not connect to the server. Check the URL and try again."
   - Auth/401/403 errors → "Session expired. Please reconnect."
   - Timeout errors → "The server took too long to respond. Try again later."
   - Default → "Something went wrong."
3. Add new i18n keys: `addressBook.sources.errorNetwork`, `errorAuth`, `errorTimeout`, `errorGeneric`

**Test:** `entities/contact/ui/__tests__/BackendErrorView.test.tsx` — renders with different error types, verifies Alert component and user-friendly messages

---

### Phase 4: SPEK-158 (Empty Backend View)
**Branch:** `fix/SPEK-158-empty-backend-view`

**Changes:**
1. Rewrite `EmptyBackendView` to use `Graphics name="emptyList" size={178}` (matching `EmptyContactList`)
2. Add contextual guidance text: "The connected server has no contacts. Contact your administrator or check the backend configuration."
3. Add i18n key: `addressBook.sources.emptyBackendDescription`

**Test:** `entities/contact/ui/__tests__/EmptyBackendView.test.tsx` — renders empty state, verifies Graphics component and description text

---

### Phase 5: SPEK-159 (Accessibility)
**Branch:** `fix/SPEK-159-accessibility`

**Changes:**
1. Add `ariaLabel` props to IconButtons:
   - `ContactRow.tsx`: sendArrow, copy, edit, delete (4 buttons)
   - `BackendContactRow.tsx`: sendArrow, copy (2 buttons)
   - `Contacts.tsx`: refresh/sync button (1 button)
2. Add `aria-label` to `BackendConnectionCard` button element
3. Wrap dynamic content area in `Contacts.tsx` with `aria-live="polite"`
4. Add `aria-busy="true"` and sr-only loading text to `BackendLoadingView`
5. Add i18n keys: `addressBook.a11y.sendTo`, `a11y.editContact`, `a11y.deleteContact`, `a11y.syncContacts`, `a11y.connectionLabel`
6. Add `general.a11y.copyAddress` key

**Test:** `entities/contact/ui/__tests__/BackendContactRow.test.tsx` — verifies aria-labels on buttons; `pages/AddressBook/__tests__/Contacts.test.tsx` — verifies aria-live region

---

### Phase 6: SPEK-160 (SyncStatusBadge)
**Branch:** `fix/SPEK-160-sync-status-badge`

**Changes:**
1. In `backend-contacts-model.ts`:
   - Add `$lastSyncTime` store (persisted to localStorage via `persist`)
   - Add `$syncStatus` computed: `'idle' | 'syncing' | 'synced' | 'error'`
   - Update on `fetchBackendContactsFx` lifecycle events
2. Create `features/contacts/BackendContacts/ui/SyncStatusBadge.tsx`:
   - "Synced 2m ago" with relative time (using `Intl.RelativeTimeFormat` or simple helper)
   - "Syncing..." with spinner icon
   - "Sync failed" with error indicator + retry click
3. Replace bare refresh `IconButton` in `Contacts.tsx` with `<SyncStatusBadge />`
4. Add i18n keys: `addressBook.sync.synced`, `syncing`, `failed`, `syncedAgo`

**Test:** `features/contacts/BackendContacts/ui/__tests__/SyncStatusBadge.test.tsx` — renders all 3 states

---

### Phase 7: SPEK-165 (Read-only Indicator)
**Branch:** `fix/SPEK-165-readonly-indicator`

**Changes:**
1. In `BackendContactRow.tsx`:
   - Add lock icon + "Synced" `Label` in the action area (after copy button)
   - Add `Tooltip` explaining "This contact is managed by the backend server"
2. Add i18n keys: `addressBook.backendContact.synced`, `backendContact.managedTooltip`

**Test:** `entities/contact/ui/__tests__/BackendContactRow.test.tsx` — verifies lock icon and "Synced" label presence

---

### Phase 8: SPEK-167 (Disconnected State + Sync Tooltip)
**Branch:** `fix/SPEK-167-disconnected-state`

**Changes:**
1. `BackendConnectionCard.tsx`:
   - When not authenticated: add warning border color, different background
   - Add small "Reconnect" text or warning dot
2. `AuthStatus.tsx`:
   - When not authenticated: show "Not connected" text instead of returning null
3. Wrap sync button in `Tooltip` with `t('addressBook.sources.syncButton')`

**Test:** `features/contacts/BackendConfiguration/ui/__tests__/BackendConnectionCard.test.tsx` — renders connected vs disconnected states, verifies visual differences

---

### Phase 9: SPEK-162 (Session Expiry)
**Branch:** `fix/SPEK-162-session-expiry`

**Changes:**
1. In `auth-model.ts`:
   - Add `$sessionHealth` store: `'healthy' | 'expired' | 'unknown'`
   - Add periodic `checkSessionFx` (every 5 minutes via `setInterval` in an init effect)
   - On session check failure: set `$sessionHealth` to `'expired'` (don't clear auth state immediately)
2. In `BackendConnectionCard.tsx`:
   - When session expired: show warning badge/banner "Session expired — Reconnect"
3. Add `AuthStatus.tsx` update: show expired state
4. Add i18n keys: `addressBook.auth.sessionExpired`, `auth.reconnect`

**Test:** `features/contacts/BackendConfiguration/ui/__tests__/AuthStatus.test.tsx` — renders healthy vs expired states

---

### Phase 10: SPEK-163 (Test Connection)
**Branch:** `fix/SPEK-163-test-connection`

**Changes:**
1. In `backend-configuration-model.ts`:
   - Add `$urlReachable` store: `null | 'checking' | 'reachable' | 'unreachable'`
   - Add `checkUrlReachabilityFx` effect (HEAD request to health endpoint)
   - Debounce URL changes (500ms) → trigger check when URL is syntactically valid
2. In `BackendConfigurationModal.tsx`:
   - Show inline indicator next to URL input: green checkmark / red X / spinner
   - Keep Connect button disabled until URL is both valid and reachable
3. Add i18n keys: `addressBook.backendConfiguration.checking`, `reachable`, `unreachable`

**Test:** `features/contacts/BackendConfiguration/ui/__tests__/BackendConfigurationModal.test.tsx` — renders URL input with reachability states

---

### Phase 11: SPEK-164 (Settings Page)
**Branch:** `fix/SPEK-164-settings-backend`

**Changes:**
1. Create `pages/Settings/Overview/components/BackendSyncSettings.tsx`:
   - Show current backend URL + connection status (connected/disconnected)
   - "Configure" button opens `BackendConfigurationModal`
   - "Not configured" state with "Add Backend" button
2. Add to `Overview.tsx` between `GeneralActions` and `SocialLinks`
3. Add i18n keys: `settings.backendSync.title`, `notConfigured`, `connected`, `disconnected`, `configureButton`

**Test:** `pages/Settings/Overview/components/__tests__/BackendSyncSettings.test.tsx` — renders configured vs unconfigured states

---

### Phase 12: SPEK-166 (Cached Contacts on Error)
**Branch:** `fix/SPEK-166-cached-contacts`

**Changes:**
1. Update `computeViewState` in `Contacts.tsx`:
   - New state: `{ view: 'staleContacts'; items: Contact[]; error: string }`
   - When backend error + cached contacts exist → show contacts with warning banner
   - When backend error + no cached contacts → show error view
2. Add `Alert variant="warn"` banner at top of stale contacts list
3. Add stale indicator when `$lastSyncTime` is > 1 hour old
4. Add i18n keys: `addressBook.sources.staleWarning`, `lastSynced`

**Test:** Contacts page test showing stale contacts with warning banner

---

## UI Test Strategy
Each test uses Vitest + React Testing Library to render the component in isolation with mocked Effector stores. Tests verify:
1. Correct component rendering (visual structure)
2. Key elements present (for screenshot verification)
3. Interaction behavior (click handlers, etc.)

Pattern:
```tsx
import { render, screen } from '@testing-library/react';
import { fork, allSettled } from 'effector';
import { Provider } from 'effector-react';

// Mock i18n
vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

// Fork scope with test data
const scope = fork({ values: [...] });

render(
  <Provider value={scope}>
    <Component />
  </Provider>
);

expect(screen.getByText(...)).toBeInTheDocument();
```

## Branch Strategy
- All branches created from `dev`
- Each branch is independent (can be reviewed/merged separately)
- Naming: `fix/SPEK-{number}-{short-description}`
