import { createRoot } from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';

import App from './App';
import './i18n';
import './index.css';
import './theme/default.css';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container is missing in index.html');
}

createRoot(container).render(
  <Router>
    <App />
  </Router>,
);

// NOTE: React 18 Strict mode renders twice in DEV mode
// https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
