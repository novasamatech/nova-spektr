import './index.css';
import './styles/theme/default.css';

import { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { HashRouter } from 'react-router-dom';

import { FallbackScreen } from '@/shared/ui';
import { isElectron } from '@shared/lib/utils';

import { ElectronSplashScreen } from './components/ElectronSplashScreen/ElectronSplashScreen';
import { WebSplashScreen } from './components/WebSplashScreen/WebSplashScreen';
import { I18Provider } from './providers/context/I18nContext';

const delay = (ttl: number) => new Promise((resolve) => setTimeout(resolve, ttl));
const App = lazy(() => import('./App').then((m) => delay(1000).then(() => ({ default: m.App }))));

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container is missing in index.html');
}

createRoot(container).render(
  <HashRouter>
    <I18Provider>
      <ErrorBoundary FallbackComponent={FallbackScreen} onError={console.error}>
        <Suspense fallback={isElectron() ? <ElectronSplashScreen /> : <WebSplashScreen />}>
          <App />
        </Suspense>
      </ErrorBoundary>
    </I18Provider>
  </HashRouter>,
);

// NOTE: React 18 Strict mode renders twice in DEV mode
// which leads to errors in components that use camera
// https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
