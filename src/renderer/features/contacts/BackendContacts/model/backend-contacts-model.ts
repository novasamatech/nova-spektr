import { createEffect, createEvent, createStore, sample } from 'effector';

import { persist } from '@/shared/api/storage';
import { type Contact } from '@/shared/core';
import { HttpError, backendContactsService } from '@/domains/backend';
import { type BackendError, contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';

function categorizeError(error: Error): BackendError {
  if (error instanceof HttpError) {
    const category = error.status === 401 ? 'auth' : error.status === 403 ? 'forbidden' : 'generic';

    return { category, message: error.message };
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

const fetchBackendContactsFx = createEffect(async (baseUrl: string): Promise<Contact[]> => {
  return backendContactsService.fetchAllContacts(baseUrl);
});

$isLoading.on(fetchBackendContactsFx, () => true);
$isLoading.on(fetchBackendContactsFx.finally, () => false);
$error.on(fetchBackendContactsFx, () => null);
$error.on(fetchBackendContactsFx.failData, (_, error) => categorizeError(error));
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

// Persist fetched backend contacts to Dexie
sample({
  clock: fetchBackendContactsFx.doneData,
  target: contactModel.effects.syncBackendContactsFx,
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

// Delete all synced contacts when connection is deleted (but not on disconnect or session expiry)
sample({
  clock: backendConfigurationModel.events.urlCleared,
  target: contactModel.effects.clearBackendContactsFx,
});

export const backendContactsModel = {
  $isLoading,
  $error,
  $lastSyncTime,
  $syncStatus,
  $syncStatusThrottled,

  events: {
    syncTriggered,
  },
};
