/**
 * Tests for src/main/preload.ts security hardening
 *
 * #18 — ALLOWED_STORE_KEYS whitelist + isAllowedKey() type guard
 * #20 — username (process.env.USER) removed from contextBridge API
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Use vi.hoisted so mock fns can be referenced in the vi.mock factory
// (vi.mock is hoisted to the top of the file; const declarations are not)
// ---------------------------------------------------------------------------
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

// Import the module once — vi.mock hoisting ensures mocks are in place.
// contextBridge.exposeInMainWorld('App', API) is called at module load time.
import '../preload';

// ---------------------------------------------------------------------------
// Capture the API once right after module load — before any clearAllMocks calls.
// We do this lazily in a beforeAll pattern via a captured variable.
// ---------------------------------------------------------------------------

let capturedAPI: Record<string, unknown>;

function getAPI(): Record<string, unknown> {
  if (!capturedAPI) {
    const calls = mockContextBridgeExposeInMainWorld.mock.calls;
    if (calls.length === 0) throw new Error('contextBridge.exposeInMainWorld was never called');
    capturedAPI = calls[calls.length - 1][1] as Record<string, unknown>;
  }

  return capturedAPI;
}

// Only reset IPC calls between tests — do NOT call vi.clearAllMocks() which
// would wipe the contextBridge.exposeInMainWorld call records.
function resetIpc() {
  mockIpcRendererInvoke.mockReset();
  mockIpcRendererOn.mockReset();
}

// ---------------------------------------------------------------------------
// Unit Tests — isAllowedKey whitelist logic (exercised via getStoreValue)
// ---------------------------------------------------------------------------

describe('preload.ts — unit: ALLOWED_STORE_KEYS whitelist', () => {
  beforeEach(resetIpc);

  it('allows the known key "autoUpdate" (getStoreValue delegates to IPC)', async () => {
    mockIpcRendererInvoke.mockResolvedValueOnce(true);

    await (getAPI().getStoreValue as (key: string) => Promise<unknown>)('autoUpdate');

    expect(mockIpcRendererInvoke).toHaveBeenCalledWith('getStoreValue', 'autoUpdate');
  });

  it('blocks an arbitrary malicious key', async () => {
    const result = await (getAPI().getStoreValue as (key: string) => unknown)('malicious-key');

    expect(result).toBeUndefined();
    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });

  it('blocks an empty string key', async () => {
    const result = await (getAPI().getStoreValue as (key: string) => unknown)('');

    expect(result).toBeUndefined();
    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });

  it('blocks prototype-pollution key "__proto__"', async () => {
    const result = await (getAPI().getStoreValue as (key: string) => unknown)('__proto__');

    expect(result).toBeUndefined();
    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });

  it('blocks "constructor" key', async () => {
    const result = await (getAPI().getStoreValue as (key: string) => unknown)('constructor');

    expect(result).toBeUndefined();
    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Integration Tests — getStoreValue through mocked ipcRenderer
// ---------------------------------------------------------------------------

describe('preload.ts — integration: getStoreValue', () => {
  beforeEach(resetIpc);

  it('calls ipcRenderer.invoke with correct args for allowed key', async () => {
    mockIpcRendererInvoke.mockResolvedValueOnce(true);

    const result = await (getAPI().getStoreValue as (key: string) => Promise<unknown>)('autoUpdate');

    expect(mockIpcRendererInvoke).toHaveBeenCalledTimes(1);
    expect(mockIpcRendererInvoke).toHaveBeenCalledWith('getStoreValue', 'autoUpdate');
    expect(result).toBe(true);
  });

  it('returns undefined and does NOT invoke IPC for blocked key', async () => {
    const result = await (getAPI().getStoreValue as (key: string) => unknown)('malicious');

    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('emits console.warn when key is blocked on read', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await (getAPI().getStoreValue as (key: string) => unknown)('hacker');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked read'));
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Integration Tests — setStoreValue through mocked ipcRenderer
// ---------------------------------------------------------------------------

describe('preload.ts — integration: setStoreValue', () => {
  beforeEach(resetIpc);

  it('calls ipcRenderer.invoke with correct args for allowed key', async () => {
    mockIpcRendererInvoke.mockResolvedValueOnce(undefined);

    await (getAPI().setStoreValue as (key: string, value: unknown) => Promise<unknown>)('autoUpdate', true);

    expect(mockIpcRendererInvoke).toHaveBeenCalledTimes(1);
    expect(mockIpcRendererInvoke).toHaveBeenCalledWith('setStoreValue', 'autoUpdate', true);
  });

  it('does NOT invoke IPC for blocked key', async () => {
    (getAPI().setStoreValue as (key: string, value: unknown) => void)('malicious', 'payload');

    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });

  it('emits console.warn when key is blocked on write', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    (getAPI().setStoreValue as (key: string, value: unknown) => void)('evil-key', 42);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked write'));
    warnSpy.mockRestore();
  });

  it('blocks setting a value with an empty key', async () => {
    (getAPI().setStoreValue as (key: string, value: unknown) => void)('', 'anything');

    expect(mockIpcRendererInvoke).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Security Test — #20: username must NOT be exposed via contextBridge
// ---------------------------------------------------------------------------

describe('preload.ts — security: username not exposed (#20)', () => {
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
