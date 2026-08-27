import { allSettled, fork } from 'effector';
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authFetch } from '@/shared/api/backend-fetch';
import { backendConfigurationModel } from '../backend-configuration-model';

// vi.mock is hoisted above the imports by vitest, so authFetch resolves to the mock below.
vi.mock('@/shared/api/backend-fetch', () => ({
  authFetch: vi.fn(),
}));

const authFetchMock = authFetch as unknown as Mock;

const URL = 'https://address-book.test';

const HEALTHY_BODY = JSON.stringify({
  status: 'ok',
  info: { database: { status: 'up' }, blockchain: { status: 'up' } },
});

const UNHEALTHY_BODY = JSON.stringify({
  status: 'error',
  info: { database: { status: 'down' }, blockchain: { status: 'up' } },
});

function ok(body: string, status = 200) {
  return { ok: true, status, headers: {}, body };
}

function notOk(body: string, status = 503) {
  return { ok: false, status, headers: {}, body };
}

async function probe(fetchResult: unknown | Error) {
  if (fetchResult instanceof Error) {
    authFetchMock.mockRejectedValueOnce(fetchResult);
  } else {
    authFetchMock.mockResolvedValueOnce(fetchResult);
  }

  // The done/fail samples only commit when the probed url still matches the draft.
  const scope = fork({ values: [[backendConfigurationModel.$draftUrl, URL]] });
  await allSettled(backendConfigurationModel.effects.checkUrlReachabilityFx, { scope, params: URL });

  return scope.getState(backendConfigurationModel.$urlReachable);
}

describe('backendConfigurationModel — reachability classification', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
  });

  it('marks reachable when the server returns a healthy Address Book payload', async () => {
    expect(await probe(ok(HEALTHY_BODY))).toBe('reachable');
  });

  it('marks unreachable when the server cannot be reached at all', async () => {
    expect(await probe(new Error('connection refused'))).toBe('unreachable');
  });

  it('marks wrongBackend when the body is not JSON', async () => {
    expect(await probe(ok('<!doctype html><html>hi</html>'))).toBe('wrongBackend');
  });

  it('marks wrongBackend when JSON does not match the Address Book health shape', async () => {
    expect(await probe(ok(JSON.stringify({ hello: 'world' })))).toBe('wrongBackend');
  });

  it('marks unreachable (not wrongBackend) when the real backend reports an unhealthy status', async () => {
    expect(await probe(ok(UNHEALTHY_BODY))).toBe('unreachable');
  });

  it('marks unreachable (not wrongBackend) when the real backend returns a 5xx with a valid shape', async () => {
    expect(await probe(notOk(HEALTHY_BODY, 503))).toBe('unreachable');
  });

  it('marks unreachable (not wrongBackend) when the server is down — proxyFetch reports status 0', async () => {
    // Electron proxyFetch swallows connection-refused and returns { ok: false, status: 0, body: '{}' }.
    // A non-2xx response must never be classified as "wrong backend".
    expect(await probe(notOk('{}', 0))).toBe('unreachable');
  });

  it('marks unreachable (not wrongBackend) for any non-2xx response, regardless of body shape', async () => {
    expect(await probe(notOk('<html>404</html>', 404))).toBe('unreachable');
  });
});

describe('backendConfigurationModel — proxy origin pin (Electron)', () => {
  const setProxyAllowedOrigin = vi.fn();

  beforeEach(() => {
    setProxyAllowedOrigin.mockReset();
    (window as unknown as { App: unknown }).App = { setProxyAllowedOrigin };
  });

  afterEach(() => {
    delete (window as unknown as { App?: unknown }).App;
  });

  it('pins the backend origin (not the full url) when the url is saved', async () => {
    const scope = fork({ values: [[backendConfigurationModel.$draftUrl, `${URL}/api/`]] });

    await allSettled(backendConfigurationModel.events.urlSaved, { scope });

    expect(setProxyAllowedOrigin).toHaveBeenCalledWith(URL);
  });

  it('clears the pin when the backend url is removed', async () => {
    const scope = fork({ values: [[backendConfigurationModel.$backendUrl, URL]] });

    await allSettled(backendConfigurationModel.events.urlCleared, { scope });

    expect(setProxyAllowedOrigin).toHaveBeenLastCalledWith(null);
  });

  it('does nothing outside Electron', async () => {
    delete (window as unknown as { App?: unknown }).App;
    const scope = fork({ values: [[backendConfigurationModel.$draftUrl, URL]] });

    await allSettled(backendConfigurationModel.events.urlSaved, { scope });

    expect(setProxyAllowedOrigin).not.toHaveBeenCalled();
  });
});
