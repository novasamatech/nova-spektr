import { createEffect, createEvent, createStore, sample } from 'effector';
import { readonly } from 'patronum';

import { localStorageService } from '@/shared/api/local-storage';
import { createForm } from '@/shared/forms';
import { BACKEND_CONFIG_STORAGE_KEY, CONNECTION_TIMEOUT } from '../lib/constants';
import { type BackendConfig, ConnectionStatus } from '../lib/types';

function validateUrl(value: string): { message: string } | undefined {
  if (!value) {
    return { message: 'backendConfig.urlRequired' };
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { message: 'backendConfig.urlInvalidProtocol' };
    }
  } catch {
    return { message: 'backendConfig.urlInvalid' };
  }
}

const modalOpened = createEvent();
const modalClosed = createEvent();
const testConnectionClicked = createEvent();
const configStarted = createEvent();

const $connectionStatus = createStore<ConnectionStatus>(ConnectionStatus.NOT_TESTED);
const $lastSyncTime = createStore<number | null>(null);
const $isModalOpen = createStore(false)
  .on(modalOpened, () => true)
  .on(modalClosed, () => false);

const form = createForm<{ url: string }>({
  fields: {
    url: {
      defaultValue: '',
      validator: () => validateUrl,
    },
  },
  validateOn: ['submit'],
});

const loadConfigFx = createEffect((): BackendConfig => {
  return localStorageService.getFromStorage<BackendConfig>(BACKEND_CONFIG_STORAGE_KEY, {
    url: '',
    lastSyncTime: null,
  });
});

const saveConfigFx = createEffect((config: BackendConfig): void => {
  localStorageService.saveToStorage(BACKEND_CONFIG_STORAGE_KEY, config);
});

const testConnectionFx = createEffect(async (url: string): Promise<boolean> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    return response.ok;
  } catch {
    clearTimeout(timeoutId);

    return false;
  }
});

sample({
  clock: configStarted,
  target: loadConfigFx,
});

sample({
  clock: loadConfigFx.doneData,
  fn: ({ url }) => ({ url }),
  target: form.setForm,
});

sample({
  clock: loadConfigFx.doneData,
  fn: ({ lastSyncTime }) => lastSyncTime,
  target: $lastSyncTime,
});

sample({
  clock: modalClosed,
  fn: () => ConnectionStatus.NOT_TESTED,
  target: $connectionStatus,
});

sample({
  clock: testConnectionClicked,
  fn: () => ConnectionStatus.TESTING,
  target: $connectionStatus,
});

sample({
  clock: testConnectionClicked,
  source: form.$values,
  fn: ({ url }) => url,
  target: testConnectionFx,
});

sample({
  clock: testConnectionFx.done,
  fn: ({ result }) => (result ? ConnectionStatus.CONNECTED : ConnectionStatus.FAILED),
  target: $connectionStatus,
});

sample({
  clock: testConnectionFx.done,
  source: form.$values,
  filter: (_, { result }) => result,
  fn: ({ url }) => ({
    url,
    lastSyncTime: Date.now(),
  }),
  target: saveConfigFx,
});

sample({
  clock: saveConfigFx.done,
  source: saveConfigFx,
  fn: () => Date.now(),
  target: $lastSyncTime,
});

export const backendConfigModel = {
  $connectionStatus: readonly($connectionStatus),
  $lastSyncTime: readonly($lastSyncTime),
  $isModalOpen: readonly($isModalOpen),
  $isTestingConnection: testConnectionFx.pending,

  form,

  events: {
    modalOpened,
    modalClosed,
    testConnectionClicked,
    configStarted,
  },
};
