import { createEffect, createEvent, createStore, sample } from 'effector';

import { persist } from '@/shared/api/storage';
import { type Contact } from '@/shared/core';
import { type BackendError, contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel } from '../../BackendConfiguration';
import { HttpError, fetchAllContacts } from '../api/backend-contacts-api';

function categorizeError(error: Error): BackendError {
  if (error instanceof HttpError) {
    const category = error.status === 401 || error.status === 403 ? 'auth' : 'generic';

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
  return fetchAllContacts(baseUrl);
});

$isLoading.on(fetchBackendContactsFx, () => true);
$isLoading.on(fetchBackendContactsFx.finally, () => false);
$error.on(fetchBackendContactsFx, () => null);
$error.on(fetchBackendContactsFx.failData, (_, error) => categorizeError(error));
$syncStatus.on(fetchBackendContactsFx, () => 'syncing');
$syncStatus.on(fetchBackendContactsFx.done, () => 'done');
$syncStatus.on(fetchBackendContactsFx.fail, () => 'error');
$lastSyncTime.on(fetchBackendContactsFx.done, () => Date.now());

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

// Clear backend contacts from DB on URL cleared
sample({
  clock: backendConfigurationModel.events.urlCleared,
  target: contactModel.effects.clearBackendContactsFx,
});
$error.on(backendConfigurationModel.events.urlCleared, () => null);
$lastSyncTime.on(backendConfigurationModel.events.urlCleared, () => null);
$syncStatus.on(backendConfigurationModel.events.urlCleared, () => 'idle');

export const backendContactsModel = {
  $isLoading,
  $error,
  $lastSyncTime,
  $syncStatus,

  events: {
    syncTriggered,
  },
};
