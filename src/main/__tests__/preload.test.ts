// @vitest-environment node

/**
 * Tests for src/main/preload.ts security hardening
 *
 * #18 — ALLOWED_STORE_KEYS whitelist + isAllowedKey() type guard #20 — username
 * (process.env.USER) removed from contextBridge API
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted ensures mock fns can be referenced in vi.mock factory
// (vi.mock is hoisted to the top of the file; const declarations are not)
const { mockIpcRendererInvoke, mockIpcRendererOn, mockContextBridgeExposeInMainWorld } = vi.hoisted(() => ({
  mockIpcRendererInvoke: vi.fn(),
  mockIpcRendererOn: vi.fn(),
  mockContextBridgeExposeInMainWorld: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: mockIpcRendererInvoke,
    on: mockIpcRendererOn,
  },
  contextBridge: {
    exposeInMainWorld: mockContextBridgeExposeInMainWorld,
  },
}));

// Import once — vi.mock hoisting ensures mocks are in place.
// contextBridge.exposeInMainWorld('App', API) is called at module load time.
import '../preload';

let capturedAPI: Record<string, unknown>;

function getAPI(): Record<string, unknown> {
  if (!capturedAPI) {
    const calls = mockContextBridgeExposeInMainWorld.mock.calls;
    if (calls.length === 0) throw new Error('contextBridge.exposeInMainWorld was never called');
    const lastCall = calls.at(-1);
    if (!lastCall) throw new Error('contextBridge.exposeInMainWorld call payload is missing');

    capturedAPI = lastCall[1] as Record<string, unknown>;
  }

  return capturedAPI;
}

// Only reset IPC calls between tests — do NOT call vi.clearAllMocks() which
// would wipe the contextBridge.exposeInMainWorld call records.
function resetIpc() {
  mockIpcRendererInvoke.mockReset();
  mockIpcRendererOn.mockReset();
}

function getStoreValue(key: string): unknown {
  return (getAPI().getStoreValue as (k: string) => unknown)(key);
}

function setStoreValue(key: string, value: unknown): unknown {
  return (getAPI().setStoreValue as (k: string, v: unknown) => unknown)(key, value);
}

describe('preload.ts — ALLOWED_STORE_KEYS whitelist', () => {
  beforeEach(resetIpc);

  it('allows the known key "autoUpdate" (getStoreValue delegates to IPC)', async () => {
    mockIpcRendererInvoke.mockResolvedValueOnce(true);

    await getStoreValue('autoUpdate');

    expect(mockIpcRendererInvoke).toHaveBeenCalledWith('getStoreValue', 'autoUpdate');
  });

  it('blocks an arbitrary malicious key', async () => {
    const result = await getStoreValue('malicious-key');

    expect(result).toBeUndefined();
    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });

  it('blocks an empty string key', async () => {
    const result = await getStoreValue('');

    expect(result).toBeUndefined();
    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });

  it('blocks prototype-pollution key "__proto__"', async () => {
    const result = await getStoreValue('__proto__');

    expect(result).toBeUndefined();
    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });

  it('blocks "constructor" key', async () => {
    const result = await getStoreValue('constructor');

    expect(result).toBeUndefined();
    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });
});

describe('preload.ts — getStoreValue', () => {
  beforeEach(resetIpc);

  it('calls ipcRenderer.invoke with correct args for allowed key', async () => {
    mockIpcRendererInvoke.mockResolvedValueOnce(true);

    const result = await getStoreValue('autoUpdate');

    expect(mockIpcRendererInvoke).toHaveBeenCalledTimes(1);
    expect(mockIpcRendererInvoke).toHaveBeenCalledWith('getStoreValue', 'autoUpdate');
    expect(result).toBe(true);
  });

  it('returns undefined and does NOT invoke IPC for blocked key', async () => {
    const result = await getStoreValue('malicious');

    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('emits console.warn when key is blocked on read', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await getStoreValue('hacker');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked read'));
    warnSpy.mockRestore();
  });
});

describe('preload.ts — setStoreValue', () => {
  beforeEach(resetIpc);

  it('calls ipcRenderer.invoke with correct args for allowed key', async () => {
    mockIpcRendererInvoke.mockResolvedValueOnce(undefined);

    await setStoreValue('autoUpdate', true);

    expect(mockIpcRendererInvoke).toHaveBeenCalledTimes(1);
    expect(mockIpcRendererInvoke).toHaveBeenCalledWith('setStoreValue', 'autoUpdate', true);
  });

  it('does NOT invoke IPC for blocked key', async () => {
    setStoreValue('malicious', 'payload');

    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });

  it('emits console.warn when key is blocked on write', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    setStoreValue('evil-key', 42);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked write'));
    warnSpy.mockRestore();
  });

  it('blocks setting a value with an empty key', async () => {
    setStoreValue('', 'anything');

    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });
});

describe('preload.ts — username not exposed (#20)', () => {
  it('does not expose "username" property on the API object', () => {
    expect(getAPI()).not.toHaveProperty('username');
  });

  it('does not leak process.env.USER value through any API property', () => {
    const userEnv = process.env.USER;

    if (userEnv) {
      const exposedStringValues = Object.values(getAPI()).filter((v) => typeof v === 'string');

      expect(exposedStringValues).not.toContain(userEnv);
    } else {
      expect(getAPI()).not.toHaveProperty('username');
    }
  });

  it('contextBridge.exposeInMainWorld is called with "App" namespace', () => {
    expect(mockContextBridgeExposeInMainWorld).toHaveBeenCalledWith('App', expect.any(Object));
  });
});
