import { combine, createEvent, createStore, sample } from 'effector';

import { persist } from '@/shared/api/storage';

const urlChanged = createEvent<string>();
const urlSaved = createEvent();
const urlCleared = createEvent();
const editStarted = createEvent();
const modalOpened = createEvent();
const modalClosed = createEvent();
const connectCompleted = createEvent();

const $backendUrl = createStore<string | null>(null);
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

const $hasBackend = $backendUrl.map((url) => url !== null);

const $isDirty = combine($draftUrl, $backendUrl, (draft, saved) => {
  return draft.trim() !== (saved ?? '');
});

$draftUrl.on(urlChanged, (_, url) => url);

sample({
  clock: modalOpened,
  fn: () => '',
  target: $draftUrl,
});

sample({
  clock: editStarted,
  source: $backendUrl,
  fn: (url) => url ?? '',
  target: $draftUrl,
});

$isModalOpen
  .on(modalOpened, () => true)
  .on(editStarted, () => true)
  .on(modalClosed, () => false)
  .on(connectCompleted, () => false);

sample({
  clock: urlSaved,
  source: $draftUrl,
  fn: (url) => url?.trim() ?? null,
  target: $backendUrl,
});

$backendUrl.on(urlCleared, () => null);
$draftUrl.on(urlCleared, () => '');

export const backendConfigurationModel = {
  $backendUrl,
  $draftUrl,
  $isModalOpen,
  $isUrlValid,
  $hasBackend,
  $isDirty,
  events: {
    urlChanged,
    urlSaved,
    urlCleared,
    editStarted,
    modalOpened,
    modalClosed,
    connectCompleted,
  },
};
