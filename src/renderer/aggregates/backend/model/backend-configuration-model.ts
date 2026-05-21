import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { debounce } from 'patronum';

import { authFetch } from '@/shared/api/backend-fetch';
import { persist } from '@/shared/api/storage';

type UrlReachability = null | 'checking' | 'reachable' | 'unreachable';

function normalizeUrl(url: string): string {
  return url.trim().replace(/#.*$/, '').replace(/\/+$/, '');
}

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

const $isUrlValid = $draftUrl.map(url => {
  const normalized = normalizeUrl(url);
  if (normalized.length === 0) return false;

  try {
    new URL(normalized);

    return true;
  } catch {
    return false;
  }
});

const $hasBackend = $backendUrl.map(url => url !== null);

const $isDirty = combine($draftUrl, $backendUrl, (draft, saved) => {
  return normalizeUrl(draft) !== (saved ?? '');
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
  fn: url => url ?? '',
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
  fn: url => (url ? normalizeUrl(url) : null) || null,
  target: $backendUrl,
});

$backendUrl.on(urlCleared, () => null);
$draftUrl.on(urlCleared, () => '');

const checkUrlReachabilityFx = createEffect(async (url: string) => {
  const result = await authFetch(`${url}/health`, { method: 'GET' });
  if (!result.ok) throw new Error(`Status ${result.status}`);
  JSON.parse(result.body);
});

const $urlReachable = createStore<UrlReachability>(null);

$urlReachable.on($draftUrl, () => null);
$urlReachable.on([editStarted, modalOpened], () => null);

const draftUrlDebounced = debounce({ source: $draftUrl, timeout: 500 });

sample({
  clock: draftUrlDebounced,
  source: $isUrlValid,
  filter: isValid => isValid,
  fn: (_, url) => normalizeUrl(url),
  target: checkUrlReachabilityFx,
});

// Re-check reachability on each modal open (draftUrl may not change, so debounce won't fire)
sample({
  clock: editStarted,
  source: $backendUrl,
  filter: (url): url is string => url !== null,
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
  filter: (draftUrl, { params: checkedUrl }) => normalizeUrl(draftUrl) === checkedUrl,
  fn: (): UrlReachability => 'reachable',
  target: $urlReachable,
});

sample({
  clock: checkUrlReachabilityFx.fail,
  source: $draftUrl,
  filter: (draftUrl, { params: checkedUrl }) => normalizeUrl(draftUrl) === checkedUrl,
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
