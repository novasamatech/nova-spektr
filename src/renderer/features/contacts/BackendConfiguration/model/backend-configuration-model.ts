import { createEvent, createStore, sample } from 'effector';

import { persist } from '@/shared/api/storage';

const urlChanged = createEvent<string>();
const urlSaved = createEvent();
const urlCleared = createEvent();
const editStarted = createEvent();
const modalOpened = createEvent();
const modalClosed = createEvent();

const $backendUrl = createStore('');
persist({ store: $backendUrl, key: 'address-book-backend-url' });

const $draftUrl = createStore('');
const $isModalOpen = createStore(false);

const $isUrlValid = $draftUrl.map((url) => {
  if (url.trim().length === 0) return false;

  try {
    new URL(url.trim());

    return true;
  } catch {
    return false;
  }
});

const $hasBackend = $backendUrl.map((url) => url.length > 0);

$draftUrl.on(urlChanged, (_, url) => url);

sample({
  clock: modalOpened,
  fn: () => '',
  target: $draftUrl,
});

sample({
  clock: editStarted,
  source: $backendUrl,
  target: $draftUrl,
});

$isModalOpen
  .on(modalOpened, () => true)
  .on(editStarted, () => true)
  .on(modalClosed, () => false);

sample({
  clock: urlSaved,
  source: $draftUrl,
  fn: (url) => url.trim(),
  target: $backendUrl,
});

sample({
  clock: urlSaved,
  fn: () => false,
  target: $isModalOpen,
});

$backendUrl.on(urlCleared, () => '');

export const backendConfigurationModel = {
  $backendUrl,
  $draftUrl,
  $isModalOpen,
  $isUrlValid,
  $hasBackend,
  events: {
    urlChanged,
    urlSaved,
    urlCleared,
    editStarted,
    modalOpened,
    modalClosed,
  },
};
