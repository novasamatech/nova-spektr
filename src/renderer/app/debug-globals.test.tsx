/**
 * Integration tests: debug globals exposure security fix (#19)
 *
 * Verifies that `window.__spektr_config` (feature-flag controls) is only
 * exposed when the app runs in DEV mode and is NOT accessible in production.
 *
 * Security risk: without this fix any user could open DevTools and call
 * window.__spektr_config.enableFeature('dappBrowser') in a production build.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock all heavy / side-effectful dependencies so that importing index.tsx
// doesn't attempt to render the full React tree or touch real storage.
// ---------------------------------------------------------------------------

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}));

vi.mock('react-router-dom', () => ({
  HashRouter: ({ children }: any) => children,
}));

vi.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children }: any) => children,
}));

vi.mock('@/shared/config/features', () => ({
  updateFeatureStatus: vi.fn(),
  resetFeatureStatuses: vi.fn(),
  $features: {},
  $defaultFeatures: {},
  $mutatedFeatures: {},
}));

vi.mock('@/shared/i18n', () => ({
  I18Provider: ({ children }: any) => children,
}));

vi.mock('@/shared/lib/utils', () => ({
  isElectron: vi.fn(() => false),
  isDev: vi.fn(() => false),
}));

vi.mock('@/shared/ui', () => ({
  FallbackScreen: () => null,
}));

vi.mock('@/shared/ui-kit', () => ({
  ThemeProvider: ({ children }: any) => children,
  NotificationProvider: ({ children }: any) => children,
}));

vi.mock('./App', () => ({ App: () => null }));
vi.mock('./DelayedSuspense', () => ({
  controlledLazy: (fn: any) => fn,
  suspenseDelay: vi.fn(() => null),
  LoadingDelay: () => null,
}));
vi.mock('./components/ElectronSplashScreen/ElectronSplashScreen', () => ({
  ElectronSplashScreen: () => null,
}));
vi.mock('./components/WebSplashScreen/WebSplashScreen', () => ({
  WebSplashScreen: () => null,
}));

// ---------------------------------------------------------------------------

// -------------------------------------------------------------------------
// DEV mode: controls MUST be exposed
// -------------------------------------------------------------------------
describe('App index — debug globals security (#19) — in development mode (import.meta.env.DEV = true)', () => {
  beforeAll(async () => {
    // Provide a minimal DOM so index.tsx doesn't throw "Root container missing"
    document.body.innerHTML = '<div id="app"></div>';
    delete (window as any).__spektr_config;

    // DEV is boolean in vite-env.d.ts; true keeps debug controls accessible
    vi.stubEnv('DEV', true);
    // Import once for the whole describe block
    await import('./index');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete (window as any).__spektr_config;
  });

  it('exposes __spektr_config on window', () => {
    expect(window.__spektr_config).toBeDefined();
  });

  it('__spektr_config has enableFeature method', () => {
    expect(typeof window.__spektr_config?.enableFeature).toBe('function');
  });

  it('__spektr_config has disableFeature method', () => {
    expect(typeof window.__spektr_config?.disableFeature).toBe('function');
  });

  it('__spektr_config has resetFeatureConfig method', () => {
    expect(typeof window.__spektr_config?.resetFeatureConfig).toBe('function');
  });

  it('enableFeature delegates to updateFeatureStatus with [name, true]', async () => {
    const { updateFeatureStatus } = await import('@/shared/config/features');

    window.__spektr_config!.enableFeature('dappBrowser');
    expect(updateFeatureStatus).toHaveBeenCalledWith(['dappBrowser', true]);
  });

  it('disableFeature delegates to updateFeatureStatus with [name, false]', async () => {
    const { updateFeatureStatus } = await import('@/shared/config/features');

    window.__spektr_config!.disableFeature('dappBrowser');
    expect(updateFeatureStatus).toHaveBeenCalledWith(['dappBrowser', false]);
  });

  it('resetFeatureConfig delegates to resetFeatureStatuses', async () => {
    const { resetFeatureStatuses } = await import('@/shared/config/features');

    window.__spektr_config!.resetFeatureConfig();
    expect(resetFeatureStatuses).toHaveBeenCalled();
  });
});

// -------------------------------------------------------------------------
// PRODUCTION mode: controls MUST NOT be exposed
// -------------------------------------------------------------------------
describe('App index — debug globals security (#19) — in production mode (import.meta.env.DEV = false)', () => {
  beforeAll(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    delete (window as any).__spektr_config;

    // DEV is boolean in vite-env.d.ts; false hides debug controls (production behaviour)
    vi.stubEnv('DEV', false);
    await import('./index');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete (window as any).__spektr_config;
  });

  it('does NOT expose __spektr_config on window', () => {
    expect(window.__spektr_config).toBeUndefined();
  });

  it('window.__spektr_config is undefined', () => {
    expect((window as any).__spektr_config).toBeUndefined();
  });

  it('window has no enableFeature method', () => {
    expect((window as any).__spektr_config?.enableFeature).toBeUndefined();
  });

  it('window has no disableFeature method', () => {
    expect((window as any).__spektr_config?.disableFeature).toBeUndefined();
  });

  it('window has no resetFeatureConfig method', () => {
    expect((window as any).__spektr_config?.resetFeatureConfig).toBeUndefined();
  });
});
