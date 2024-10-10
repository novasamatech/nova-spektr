import './index.css';
import './styles/theme/default.css';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { HashRouter } from 'react-router-dom';

import { isElectron } from '@/shared/lib/utils';
import { FallbackScreen } from '@/shared/ui';

import { LoadingDelay, controlledLazy, suspenseDelayAdapter } from './DelayedSuspense';
import { ElectronSplashScreen } from './components/ElectronSplashScreen/ElectronSplashScreen';
import { WebSplashScreen } from './components/WebSplashScreen/WebSplashScreen';
import { I18Provider } from './providers/context/I18nContext';

const CLEAR_LOADING_TIMEOUT = 700;
const DIRTY_LOADING_TIMEOUT = 2000;

const App = controlledLazy(() => import('./App').then((m) => m.App));

const Root = () => {
  const [renderSplashScreen, setRenderSplashScreen] = useState(false);
  const [appLoaded, setAppLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setRenderSplashScreen(true);
    }, CLEAR_LOADING_TIMEOUT);
  }, []);

  const loadingDelay = useMemo(() => {
    return !appLoaded && renderSplashScreen ? suspenseDelayAdapter(DIRTY_LOADING_TIMEOUT) : null;
  }, [renderSplashScreen, appLoaded]);

  const splashScreen = renderSplashScreen ? isElectron() ? <ElectronSplashScreen /> : <WebSplashScreen /> : null;

  return (
    <HashRouter>
      <I18Provider>
        <ErrorBoundary FallbackComponent={FallbackScreen} onError={console.error}>
          <Suspense fallback={splashScreen}>
            <App onReady={() => setAppLoaded(true)} />
            <LoadingDelay suspense={loadingDelay} />
          </Suspense>
        </ErrorBoundary>
      </I18Provider>
    </HashRouter>
  );
};

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container is missing in index.html');
}

createRoot(container).render(<Root />);

// NOTE: React 18 Strict mode renders twice in DEV mode
// which leads to errors in components that use camera
// https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
