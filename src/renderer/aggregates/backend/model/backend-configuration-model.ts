import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { debounce } from 'patronum';
import { z } from 'zod';

import { authFetch } from '@/shared/api/backend-fetch';
import { persist } from '@/shared/api/storage';

type UrlReachability = null | 'checking' | 'reachable' | 'unreachable' | 'wrongBackend';

const healthResponseSchema = z.object({
  status: z.string(),
  info: z.object({
    database: z.object({ status: z.string() }),
    blockchain: z.object({ status: z.string() }),
  }),
});

class WrongBackendError extends Error {}

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
  let result: Awaited<ReturnType<typeof authFetch>>;
  try {
    result = await authFetch(`${url}/health`, { method: 'GET' });
  } catch {
    // Couldn't reach the server at all (DNS, timeout) — transient, retry may help.
    throw new Error('Network unreachable');
  }

  // A non-2xx response means the server is down (proxyFetch reports refused connections as
  // status 0), erroring, or behind a failing proxy — all transient. Only a successful response
  // lets us judge whether we reached the *right* server, so these must never be "wrong backend".
  if (!result.ok) {
    throw new Error('Server unavailable');
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(result.body);
  } catch {
    // Non-JSON body on a 2xx — the server responded, but it isn't an Address Book.
  }

  const health = healthResponseSchema.safeParse(parsed);
  if (!health.success) {
    // 2xx with a foreign payload shape — pointed at the wrong server.
    throw new WrongBackendError('Unexpected health response structure');
  }

  if (health.data.status !== 'ok') {
    // It is an Address Book, but currently reporting unhealthy — transient.
    throw new Error('Backend unhealthy');
  }
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
  fn: (_, { error }): UrlReachability => (error instanceof WrongBackendError ? 'wrongBackend' : 'unreachable'),
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
