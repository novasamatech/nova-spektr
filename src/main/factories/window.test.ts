// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockOnHeadersReceived = vi.fn();
const mockOnBeforeSendHeaders = vi.fn();
const mockSetWindowOpenHandler = vi.fn();
const mockLoadURL = vi.fn();
const mockOn = vi.fn();

const mockWindow = {
  loadURL: mockLoadURL,
  webContents: {
    openDevTools: vi.fn(),
    setWindowOpenHandler: mockSetWindowOpenHandler,
  },
  on: mockOn,
};

vi.mock('electron', () => ({
  BrowserWindow: class {
    constructor() {
      return mockWindow;
    }
  },
  Menu: {
    setApplicationMenu: vi.fn(),
    buildFromTemplate: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
  session: {
    defaultSession: {
      webRequest: {
        onBeforeSendHeaders: mockOnBeforeSendHeaders,
        onHeadersReceived: mockOnHeadersReceived,
      },
    },
  },
  app: {
    getPath: vi.fn(() => '/tmp'),
  },
}));

vi.mock('electron-window-state', () => ({
  default: vi.fn(() => ({
    x: 0,
    y: 0,
    width: 1024,
    height: 768,
    manage: vi.fn(),
  })),
}));

vi.mock('~config', () => ({
  main: { window: { width: 1024, height: 768 } },
  renderer: { server: { protocol: 'http://', host: 'localhost', port: 3000 } },
  title: 'Nova Spektr',
}));

vi.mock('./menu', () => ({
  buildMenuTemplate: vi.fn(() => []),
}));

vi.mock('../shared/constants/environment', () => ({
  ENVIRONMENT: {
    RENDERER_SOURCE: undefined,
    IS_DEV: false,
    IS_STAGE: false,
  },
}));

const EXPECTED_CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' wss: ws: https: http:; font-src 'self' data:; worker-src 'self' blob:; object-src 'none'; frame-src 'none'";

type HeadersReceivedCallback = (
  details: Record<string, unknown>,
  callback: (result: Record<string, unknown>) => void,
) => void;

async function getHeadersReceivedCallback(): Promise<HeadersReceivedCallback> {
  mockOnHeadersReceived.mockReset();
  const { createWindow } = await import('./window');
  createWindow();
  expect(mockOnHeadersReceived).toHaveBeenCalledTimes(1);
  const call = mockOnHeadersReceived.mock.calls[0];
  if (!call) throw new Error('onHeadersReceived was not called');
  return call[0] as HeadersReceivedCallback;
}

async function invokeCallback(
  callback: HeadersReceivedCallback,
  existingHeaders: Record<string, string[]> = {},
  resourceType = 'mainFrame',
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => callback({ responseHeaders: existingHeaders, resourceType }, resolve));
}

describe('window.ts — CSP header via session.webRequest.onHeadersReceived', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should register onHeadersReceived handler on the default session', async () => {
    mockOnHeadersReceived.mockReset();
    const { createWindow } = await import('./window');
    createWindow();
    expect(mockOnHeadersReceived).toHaveBeenCalledTimes(1);
  });

  it('should inject Content-Security-Policy into document response headers', async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, {}, 'mainFrame');
    const headers = result.responseHeaders as Record<string, string[]>;
    expect(headers).toHaveProperty('Content-Security-Policy');
  });

  it('should NOT inject CSP into non-document responses (e.g. websocket, xhr)', async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, { 'X-Custom': ['value'] }, 'websocket');
    expect(result.cancel).toBe(false);
    expect(result.responseHeaders).toBeUndefined();
  });

  it('CSP header value should be an array with exactly one entry', async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, {}, 'mainFrame');
    const headers = result.responseHeaders as Record<string, string[]>;
    const cspValues = headers['Content-Security-Policy'];
    expect(Array.isArray(cspValues)).toBe(true);
    expect(cspValues).toHaveLength(1);
  });

  it("should set directive default-src 'self'", async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, {}, 'mainFrame');
    const headers = result.responseHeaders as Record<string, string[]>;
    expect(headers['Content-Security-Policy']?.[0]).toContain("default-src 'self'");
  });

  it("should set directive script-src 'self' 'wasm-unsafe-eval'", async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, {}, 'mainFrame');
    const headers = result.responseHeaders as Record<string, string[]>;
    expect(headers['Content-Security-Policy']?.[0]).toContain("script-src 'self' 'wasm-unsafe-eval'");
  });

  it("should set directive object-src 'none' (blocks embedded plugins/Flash)", async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, {}, 'mainFrame');
    const headers = result.responseHeaders as Record<string, string[]>;
    expect(headers['Content-Security-Policy']?.[0]).toContain("object-src 'none'");
  });

  it("should set directive frame-src 'none' (blocks iframes)", async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, {}, 'mainFrame');
    const headers = result.responseHeaders as Record<string, string[]>;
    expect(headers['Content-Security-Policy']?.[0]).toContain("frame-src 'none'");
  });

  it('should set connect-src directive allowing wss: ws: https: http: (Substrate RPC)', async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, {}, 'mainFrame');
    const headers = result.responseHeaders as Record<string, string[]>;
    const csp = headers['Content-Security-Policy']?.[0];
    expect(csp).toContain('connect-src');
    expect(csp).toContain('wss:');
    expect(csp).toContain('ws:');
    expect(csp).toContain('https:');
    expect(csp).toContain('http:');
  });

  it('should set img-src directive allowing data: blob: https:', async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, {}, 'mainFrame');
    const headers = result.responseHeaders as Record<string, string[]>;
    const csp = headers['Content-Security-Policy']?.[0];
    expect(csp).toContain('img-src');
    expect(csp).toContain('data:');
    expect(csp).toContain('blob:');
    expect(csp).toContain('https:');
  });

  it("should set worker-src 'self' blob: directive", async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, {}, 'mainFrame');
    const headers = result.responseHeaders as Record<string, string[]>;
    expect(headers['Content-Security-Policy']?.[0]).toContain("worker-src 'self' blob:");
  });

  it('should NOT contain upgrade-insecure-requests (unnecessary in Electron file:// context)', async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, {}, 'mainFrame');
    const headers = result.responseHeaders as Record<string, string[]>;
    expect(headers['Content-Security-Policy']?.[0]).not.toContain('upgrade-insecure-requests');
  });

  it('should preserve existing response headers (spread behaviour)', async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(
      cb,
      {
        'Content-Type': ['text/html; charset=utf-8'],
        'X-Frame-Options': ['DENY'],
      },
      'mainFrame',
    );
    const headers = result.responseHeaders as Record<string, string[]>;
    expect(headers['Content-Type']).toEqual(['text/html; charset=utf-8']);
    expect(headers['X-Frame-Options']).toEqual(['DENY']);
    expect(headers['Content-Security-Policy']).toBeDefined();
  });

  it('CSP value should match the full expected policy string exactly', async () => {
    const cb = await getHeadersReceivedCallback();
    const result = await invokeCallback(cb, {}, 'mainFrame');
    const headers = result.responseHeaders as Record<string, string[]>;
    expect(headers['Content-Security-Policy']?.[0]).toBe(EXPECTED_CSP);
  });
});
