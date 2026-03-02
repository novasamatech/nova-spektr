import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { debounce } from 'patronum';

import { persist } from '@/shared/api/storage';
import { isElectron } from '@/shared/lib/utils';

type UrlReachability = null | 'checking' | 'reachable' | 'unreachable';

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

const checkUrlReachabilityFx = createEffect(async (url: string) => {
  if (isElectron()) {
    const result = await window.App.proxyFetch(`${url}/health`, { method: 'GET' });
    if (!result.ok) throw new Error(`Status ${result.status}`);
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
    } finally {
      clearTimeout(timeout);
    }
  }
});

const $urlReachable = createStore<UrlReachability>(null);

$urlReachable.on($draftUrl, () => null);

const draftUrlDebounced = debounce({ source: $draftUrl, timeout: 500 });

sample({
  clock: draftUrlDebounced,
  source: $isUrlValid,
  filter: (isValid) => isValid,
  fn: (_, url) => url,
  target: checkUrlReachabilityFx,
});

sample({
  clock: checkUrlReachabilityFx,
  fn: (): UrlReachability => 'checking',
  target: $urlReachable,
});

sample({
  clock: checkUrlReachabilityFx.done,
  source: $draftUrl,
  filter: (draftUrl, { params: checkedUrl }) => draftUrl.trim() === checkedUrl,
  fn: (): UrlReachability => 'reachable',
  target: $urlReachable,
});

sample({
  clock: checkUrlReachabilityFx.fail,
  source: $draftUrl,
  filter: (draftUrl, { params: checkedUrl }) => draftUrl.trim() === checkedUrl,
  fn: (): UrlReachability => 'unreachable',
  target: $urlReachable,
});

export const backendConfigurationModel = {
  $backendUrl,
  $draftUrl,
  $isModalOpen,
  $isUrlValid,
  $hasBackend,
  $isDirty,
  $urlReachable,
  effects: {
    checkUrlReachabilityFx,
  },
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
