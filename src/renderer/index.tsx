import { createRoot } from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';

import App from './App';
import './i18n';
import './index.css';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container is missing in index.html');
}

createRoot(container).render(
  <Router>
    <App />
  </Router>,
);

window.addEventListener('error', (event) => {
  event.preventDefault();

  const { message, filename } = event;
  console.error(`🛑 Something went wrong!\nError: ${message} in ${filename}`);
});

// NOTE: React 18 Strict mode renders twice in DEV mode
// https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
