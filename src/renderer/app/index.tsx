import './polyfills';
import './index.css';
import './document.css';
import './styles/theme/default.css';
import './styles/theme/dark.css';

import '@/shared/assets/fonts/Inter/Inter-400.woff2';
import '@/shared/assets/fonts/Inter/Inter-500.woff2';
import '@/shared/assets/fonts/Inter/Inter-600.woff2';
import '@/shared/assets/fonts/Inter/Inter-800.woff2';
import '@/shared/assets/fonts/Manrope/Manrope-400.woff2';
import '@/shared/assets/fonts/Manrope/Manrope-500.woff2';
import '@/shared/assets/fonts/Manrope/Manrope-600.woff2';
import '@/shared/assets/fonts/Manrope/Manrope-800.woff2';

import { useUnit } from 'effector-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { HashRouter } from 'react-router-dom';

import { resetFeatureStatuses, updateFeatureStatus } from '@/shared/config/features';
import { I18Provider } from '@/shared/i18n';
import { isElectron } from '@/shared/lib/utils';
import { FallbackScreen } from '@/shared/ui';
import { NotificationProvider, ThemeProvider } from '@/shared/ui-kit';
import { $theme } from '@/entities/theme';

import { LoadingDelay, controlledLazy, suspenseDelay } from './DelayedSuspense';
import { ElectronSplashScreen } from './components/ElectronSplashScreen/ElectronSplashScreen';
import { WebSplashScreen } from './components/WebSplashScreen/WebSplashScreen';

declare global {
  interface Window {
    __spektr_config: {
      enableFeature(name: string): void;
      disableFeature(name: string): void;
      resetFeatureConfig(): void;
    };
  }
}

window.__spektr_config = {
  enableFeature: (name) => updateFeatureStatus([name, true]),
  disableFeature: (name) => updateFeatureStatus([name, false]),
  resetFeatureConfig: () => resetFeatureStatuses(),
};

const CLEAR_LOADING_TIMEOUT = 700;
const DIRTY_LOADING_TIMEOUT = 2000;

const App = controlledLazy(() => import('./App').then((m) => m.App));

/**
 * All this loading logic can be described like this:
 *
 * If App component loads before `CLEAR_LOADING_TIMEOUT` timeout it shows
 * immediately, else splash screen appears for at least DIRTY_LOADING_TIMEOUT.
 */
const Root = () => {
  const theme = useUnit($theme);
  const [renderSplashScreen, setRenderSplashScreen] = useState(false);
  const [appLoaded, setAppLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setRenderSplashScreen(true);
    }, CLEAR_LOADING_TIMEOUT);
  }, []);

  const loadingDelay = useMemo(() => {
    return !appLoaded && renderSplashScreen ? suspenseDelay(DIRTY_LOADING_TIMEOUT) : null;
  }, [renderSplashScreen, appLoaded]);

  const splashScreen = renderSplashScreen ? isElectron() ? <ElectronSplashScreen /> : <WebSplashScreen /> : null;

  return (
    <ThemeProvider theme={theme} iconStyle="colored">
      <HashRouter>
        <I18Provider>
          <ErrorBoundary
            FallbackComponent={FallbackScreen}
            onError={(error, errorInfo) => {
              console.error(error.message);
              console.error(errorInfo.componentStack);
              if (error.message.includes('Failed to fetch dynamically imported module') && import.meta.env.PROD) {
                location.reload();
              }
            }}
          >
            <NotificationProvider>
              <Suspense fallback={splashScreen}>
                <App onReady={() => setAppLoaded(true)} />
                <LoadingDelay suspense={loadingDelay} />
              </Suspense>
            </NotificationProvider>
          </ErrorBoundary>
        </I18Provider>
      </HashRouter>
    </ThemeProvider>
  );
};

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container is missing in index.html');
}

document.body.style.minWidth = `1372px`;

// NOTE: React 18 Strict mode renders twice in DEV mode
// which leads to errors in components that use camera
// https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
createRoot(container).render(<Root />);
