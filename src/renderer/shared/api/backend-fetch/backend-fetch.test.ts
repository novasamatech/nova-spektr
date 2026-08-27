import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { isElectronMock } = vi.hoisted(() => ({ isElectronMock: vi.fn(() => false) }));

vi.mock('@/shared/lib/utils', () => ({ isElectron: isElectronMock }));

import { authFetch, clearCsrfToken, getCsrfToken, parseResponse } from './backend-fetch';

type MockResponseOptions = {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
};

function mockFetchResponse({ status = 200, headers = {}, body = '{}' }: MockResponseOptions = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('authFetch', () => {
  beforeEach(() => {
    isElectronMock.mockReturnValue(false);
    clearCsrfToken();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as unknown as { App?: unknown }).App;
  });

  it('captures x-csrf-token from the response and sends it as X-CSRF-Token on the next request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockFetchResponse({ headers: { 'x-csrf-token': 'token-1' } }))
      .mockResolvedValueOnce(mockFetchResponse());
    vi.stubGlobal('fetch', fetchMock);

    await authFetch('https://backend.test/a');
    expect(getCsrfToken()).toBe('token-1');

    await authFetch('https://backend.test/b');

    const [, secondInit] = fetchMock.mock.calls[1]!;
    expect(secondInit.headers['X-CSRF-Token']).toBe('token-1');
  });

  it('rotates the stored token when a newer response provides a different one', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockFetchResponse({ headers: { 'x-csrf-token': 'token-1' } }))
      .mockResolvedValueOnce(mockFetchResponse({ headers: { 'x-csrf-token': 'token-2' } }))
      .mockResolvedValueOnce(mockFetchResponse());
    vi.stubGlobal('fetch', fetchMock);

    await authFetch('https://backend.test/a');
    expect(getCsrfToken()).toBe('token-1');

    await authFetch('https://backend.test/b');
    expect(getCsrfToken()).toBe('token-2');

    await authFetch('https://backend.test/c');
    const [, thirdInit] = fetchMock.mock.calls[2]!;
    expect(thirdInit.headers['X-CSRF-Token']).toBe('token-2');
  });

  it('clearCsrfToken stops the header from being sent on subsequent requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockFetchResponse({ headers: { 'x-csrf-token': 'token-1' } }))
      .mockResolvedValueOnce(mockFetchResponse());
    vi.stubGlobal('fetch', fetchMock);

    await authFetch('https://backend.test/a');
    expect(getCsrfToken()).toBe('token-1');

    clearCsrfToken();
    expect(getCsrfToken()).toBeNull();

    await authFetch('https://backend.test/b');
    const [, secondInit] = fetchMock.mock.calls[1]!;
    expect(secondInit.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('browser path calls fetch with credentials: include', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockFetchResponse());
    vi.stubGlobal('fetch', fetchMock);

    await authFetch('https://backend.test/a', { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.test/a',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    );
  });

  it('uses window.App.proxyFetch instead of fetch when isElectron() is true', async () => {
    isElectronMock.mockReturnValue(true);

    const proxyFetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: {}, body: '{}' });
    (window as unknown as { App: unknown }).App = { proxyFetch: proxyFetchMock, setProxyAllowedOrigin: vi.fn() };

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await authFetch('https://backend.test/a', { method: 'GET' });

    expect(proxyFetchMock).toHaveBeenCalledWith('https://backend.test/a', expect.objectContaining({ method: 'GET' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, status: 200, headers: {}, body: '{}' });
  });
});

describe('authFetch — proxy origin pin (Electron)', () => {
  const proxyFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: {}, body: '{}' });
  const setProxyAllowedOrigin = vi.fn().mockResolvedValue(undefined);

  // Module state (the pinned origin) must not leak between tests.
  async function freshAuthFetch() {
    vi.resetModules();
    const module = await import('./backend-fetch');

    return module.authFetch;
  }

  beforeEach(() => {
    isElectronMock.mockReturnValue(true);
    proxyFetch.mockClear();
    setProxyAllowedOrigin.mockClear();
    (window as unknown as { App: unknown }).App = { proxyFetch, setProxyAllowedOrigin };
  });

  afterEach(() => {
    delete (window as unknown as { App?: unknown }).App;
  });

  it('pins the request origin (not the full url) before the first proxy fetch', async () => {
    const authFetch = await freshAuthFetch();
    const order: string[] = [];
    setProxyAllowedOrigin.mockImplementationOnce(async () => {
      order.push('pin');
    });
    proxyFetch.mockImplementationOnce(async () => {
      order.push('fetch');

      return { ok: true, status: 200, headers: {}, body: '{}' };
    });

    await authFetch('https://backend.test/api/health');

    expect(setProxyAllowedOrigin).toHaveBeenCalledWith('https://backend.test');
    expect(order).toEqual(['pin', 'fetch']);
  });

  it('does not re-pin for subsequent requests to the same origin', async () => {
    const authFetch = await freshAuthFetch();

    await authFetch('https://backend.test/a');
    await authFetch('https://backend.test/b');

    expect(setProxyAllowedOrigin).toHaveBeenCalledTimes(1);
    expect(proxyFetch).toHaveBeenCalledTimes(2);
  });

  it('re-pins when the origin changes', async () => {
    const authFetch = await freshAuthFetch();

    await authFetch('https://backend.test/a');
    await authFetch('http://localhost:5000/a');

    expect(setProxyAllowedOrigin).toHaveBeenCalledTimes(2);
    expect(setProxyAllowedOrigin).toHaveBeenLastCalledWith('http://localhost:5000');
  });

  it('does not pin outside Electron', async () => {
    isElectronMock.mockReturnValue(false);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse()));
    const authFetch = await freshAuthFetch();

    await authFetch('https://backend.test/a');

    expect(setProxyAllowedOrigin).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('parseResponse', () => {
  it('throws an Error with the string message on a non-ok result', () => {
    const result = { ok: false, status: 400, headers: {}, body: JSON.stringify({ message: 'Bad input' }) };

    expect(() => parseResponse(result, z.unknown())).toThrow('Bad input');
  });

  it('throws a readable joined Error when the message is a string array', () => {
    const result = {
      ok: false,
      status: 400,
      headers: {},
      body: JSON.stringify({ message: ['field required', 'too long'] }),
    };

    expect(() => parseResponse(result, z.unknown())).toThrow('field required, too long');
  });

  it('falls back to a status-based message when no message is provided', () => {
    const result = { ok: false, status: 503, headers: {}, body: '{}' };

    expect(() => parseResponse(result, z.unknown())).toThrow('Request failed with status 503');
  });

  it('parses and returns the body against the schema on success', () => {
    const schema = z.object({ id: z.string() });
    const result = { ok: true, status: 200, headers: {}, body: JSON.stringify({ id: 'abc' }) };

    expect(parseResponse(result, schema)).toEqual({ id: 'abc' });
  });

  it('throws when the body does not match the schema', () => {
    const schema = z.object({ id: z.string() });
    const result = { ok: true, status: 200, headers: {}, body: JSON.stringify({ id: 42 }) };

    expect(() => parseResponse(result, schema)).toThrow();
  });
});
