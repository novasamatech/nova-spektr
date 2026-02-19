import { createEffect, createEvent, createStore, sample } from 'effector';

import { type Contact } from '@/shared/core';
import { contactModel } from '@/entities/contact';
import { authModel, backendConfigurationModel } from '../../BackendConfiguration';
import { fetchAllContacts } from '../api/backend-contacts-api';

const syncTriggered = createEvent();

const $isLoading = createStore(false);
const $error = createStore<string | null>(null);

const fetchBackendContactsFx = createEffect(async (baseUrl: string): Promise<Contact[]> => {
  return fetchAllContacts(baseUrl);
});

$isLoading.on(fetchBackendContactsFx, () => true);
$isLoading.on(fetchBackendContactsFx.finally, () => false);
$error.on(fetchBackendContactsFx, () => null);
$error.on(fetchBackendContactsFx.failData, (_, error) => error.message);

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

export const backendContactsModel = {
  $isLoading,
  $error,

  events: {
    syncTriggered,
  },
};
