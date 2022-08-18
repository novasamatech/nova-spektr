import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import App from './App';
import './i18n';
import './index.css';
import { ButtonLink } from './components/ui';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container is missing in index.html');
}

createRoot(container).render(
  <StrictMode>
    <Router>
      <ErrorBoundary
        fallbackRender={() => (
          <div>
            <ButtonLink to="/" variant="fill" pallet="error">
              Reload
            </ButtonLink>
          </div>
        )}
        onError={console.error}
      >
        <App />
      </ErrorBoundary>
    </Router>
  </StrictMode>,
);

// NOTE: React 18 Strict mode renders twice in DEV mode
// https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
