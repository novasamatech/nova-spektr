import { combine, createEffect, createEvent, createStore, sample } from 'effector';

import { persist } from '@/shared/api/storage';
import { type BackendContact } from '@/shared/core';
import { HttpError, backendContactsService } from '@/domains/backend';
import { type BackendError, contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';

function categorizeError(error: Error): BackendError {
  if (error instanceof HttpError) {
    const category = error.status === 401 ? 'auth' : error.status === 403 ? 'forbidden' : 'generic';
    // auth/forbidden titles are self-contained — don't expose raw HTTP response body
    const message = category === 'generic' ? error.message : undefined;

    return { category, message };
  }

  if (error.name === 'AbortError') return { category: 'timeout', message: error.message };
  if (error.name === 'TypeError') return { category: 'network', message: error.message };

  return { category: 'generic', message: error.message };
}

type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

const syncTriggered = createEvent();

const $isLoading = createStore(false);
const $error = createStore<BackendError | null>(null);
const $lastSyncTime = createStore<number | null>(null);
persist({ store: $lastSyncTime, key: 'address-book-last-sync-time' });
const $syncStatus = createStore<SyncStatus>('idle');

const fetchBackendContactsFx = createEffect(async (baseUrl: string): Promise<BackendContact[]> => {
  const result = await backendContactsService.fetchAllContacts(baseUrl);

  return result.filter((c): c is BackendContact => c.source === 'backend');
});

$isLoading.on(fetchBackendContactsFx, () => true);
$isLoading.on(fetchBackendContactsFx.finally, () => false);
$error.on(fetchBackendContactsFx, () => null);
$error.on(fetchBackendContactsFx.failData, (_, error) => categorizeError(error));

sample({
  clock: fetchBackendContactsFx.failData,
  filter: (error) => error instanceof HttpError && error.status === 401,
  target: authModel.events.unauthorizedResponseReceived,
});
$syncStatus.on(fetchBackendContactsFx, () => 'syncing');
$syncStatus.on(fetchBackendContactsFx.done, () => 'done');
$syncStatus.on(fetchBackendContactsFx.fail, () => 'error');
$lastSyncTime.on(fetchBackendContactsFx.done, () => Date.now());

// Minimum 300ms display time for 'syncing' state (leading throttle)
let syncStartedAt = 0;

const ensureMinSyncTimeFx = createEffect(async (status: SyncStatus) => {
  const remaining = 300 - (Date.now() - syncStartedAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }

  return status;
});

const $syncStatusThrottled = createStore<SyncStatus>('idle');

sample({
  clock: $syncStatus,
  filter: (status) => status === 'syncing',
  fn: (status) => {
    syncStartedAt = Date.now();

    return status;
  },
  target: $syncStatusThrottled,
});

sample({
  clock: $syncStatus,
  filter: (status) => status !== 'syncing',
  target: ensureMinSyncTimeFx,
});

$syncStatusThrottled.on(ensureMinSyncTimeFx.doneData, (_, status) => status);

// Push freshly fetched contacts into the contact entity (in-memory, never persisted)
sample({
  clock: fetchBackendContactsFx.doneData,
  target: contactModel.events.backendContactsReceived,
});

// Auto-fetch when auth state changes to non-null
sample({
  clock: authModel.$authState,
  source: backendConfigurationModel.$backendUrl,
  filter: (url, authState): url is string => url !== null && authState !== null,
  target: fetchBackendContactsFx,
});

// Manual sync
sample({
  clock: syncTriggered,
  source: backendConfigurationModel.$backendUrl,
  filter: (url): url is string => url !== null,
  target: fetchBackendContactsFx,
});

$error.on(authModel.events.signOutClicked, () => null);

$error.on(backendConfigurationModel.events.urlCleared, () => null);
$lastSyncTime.on(backendConfigurationModel.events.urlCleared, () => null);
$syncStatus.on(backendConfigurationModel.events.urlCleared, () => 'idle');

const sessionExpired = sample({
  clock: authModel.$isSessionExpired,
  filter: (expired) => expired,
});

$error.on(sessionExpired, () => null);
$lastSyncTime.on(sessionExpired, () => null);
$syncStatus.on(sessionExpired, () => 'idle');

// All disconnect signals reset the entity's backend-contact store. New disconnect events get added
// here once and pick up the cleanup automatically — no per-trigger imperative clear is needed.
sample({
  clock: [
    backendConfigurationModel.events.urlCleared,
    authModel.events.signOutClicked,
    sessionExpired,
    sample({ clock: authModel.$hasNetworkIssue, filter: (issue) => issue }),
    fetchBackendContactsFx.failData,
  ],
  target: contactModel.events.backendContactsCleared,
});

const networkIssueCleared = sample({
  clock: authModel.$hasNetworkIssue,
  filter: (issue) => !issue,
});

sample({
  clock: networkIssueCleared,
  source: { url: backendConfigurationModel.$backendUrl, authState: authModel.$authState },
  filter: ({ url, authState }) => url !== null && authState !== null,
  fn: ({ url }) => url!,
  target: fetchBackendContactsFx,
});

// Address book is "healthy" when the user is signed in, no auth/network issues, and contacts are
// not in sync-error state. UI surfaces (sidebar pill/dot, drafts overlay, save-as-draft swap)
// derive their visibility from this single source of truth.
const $hasAuthIssue = combine(
  {
    isAuthenticated: authModel.$isAuthenticated,
    isSessionExpired: authModel.$isSessionExpired,
    hasNetworkIssue: authModel.$hasNetworkIssue,
  },
  ({ isAuthenticated, isSessionExpired, hasNetworkIssue }) => !isAuthenticated || isSessionExpired || hasNetworkIssue,
);

const $isHealthy = combine(
  $hasAuthIssue,
  $syncStatus,
  (hasAuthIssue, syncStatus) => !hasAuthIssue && syncStatus !== 'error',
);

export const backendContactsModel = {
  $isLoading,
  $error,
  $lastSyncTime,
  $syncStatus,
  $syncStatusThrottled,
  $isHealthy,

  events: {
    syncTriggered,
  },

  __test: {
    fetchBackendContactsFx,
  },
};
