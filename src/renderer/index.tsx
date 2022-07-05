import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container is missing in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
