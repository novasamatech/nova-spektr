import { createRoot } from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';
import log from 'electron-log';

import { currencyModel } from '@renderer/entities/price';
// import { priceModel, currencyModel } from '@renderer/entities/price';
import App from './App';

import './i18n';
import './index.css';
import './styles/theme/default.css';

log.variables.version = process.env.VERSION;
log.variables.env = process.env.NODE_ENV;
log.transports.console.format = '{y}/{m}/{d} {h}:{i}:{s}.{ms} [{env}#{version}]-{processType} [{level}] > {text}';
log.transports.console.useStyles = true;

Object.assign(console, log.functions);
log.errorHandler.startCatching({
  showDialog: false,
  onError({ createIssue, error, processType, versions }) {
    console.error('Uncaught error', error);
  },
});

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container is missing in index.html');
}

// priceModel.events.appStarted();
currencyModel.events.appStarted();

createRoot(container).render(
  <Router>
    <App />
  </Router>,
);

// NOTE: React 18 Strict mode renders twice in DEV mode
// https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
