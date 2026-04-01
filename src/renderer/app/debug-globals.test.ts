import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({ render: vi.fn() })),
}));

vi.mock('react-router-dom', () => ({
  HashRouter: ({ children }: { children: unknown }) => children,
}));

vi.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children }: { children: unknown }) => children,
}));

vi.mock('@/shared/config/features', () => ({
  updateFeatureStatus: vi.fn(),
  resetFeatureStatuses: vi.fn(),
  $features: {},
  $defaultFeatures: {},
  $mutatedFeatures: {},
}));

vi.mock('@/shared/i18n', () => ({
  I18Provider: ({ children }: { children: unknown }) => children,
}));

vi.mock('@/shared/lib/utils', () => ({
  isElectron: vi.fn(() => false),
  isDev: vi.fn(() => false),
}));

vi.mock('@/shared/ui', () => ({
  FallbackScreen: () => null,
}));

vi.mock('@/shared/ui-kit', () => ({
  ThemeProvider: ({ children }: { children: unknown }) => children,
  NotificationProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock('./App', () => ({ App: () => null }));
vi.mock('./DelayedSuspense', () => ({
  controlledLazy: (fn: unknown) => fn,
  suspenseDelay: vi.fn(() => null),
  LoadingDelay: () => null,
}));
vi.mock('./components/ElectronSplashScreen/ElectronSplashScreen', () => ({
  ElectronSplashScreen: () => null,
}));
vi.mock('./components/WebSplashScreen/WebSplashScreen', () => ({
  WebSplashScreen: () => null,
}));

describe('debug globals — development mode', () => {
  beforeAll(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    delete (window as any).__spektr_config;

    vi.stubEnv('DEV', true);
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

describe('debug globals — production mode', () => {
  beforeAll(async () => {
    document.body.innerHTML = '<div id="app"></div>';
    delete (window as any).__spektr_config;

    vi.stubEnv('DEV', false);
    await import('./index');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete (window as any).__spektr_config;
  });

  it('does not expose __spektr_config on window', () => {
    expect(window.__spektr_config).toBeUndefined();
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
