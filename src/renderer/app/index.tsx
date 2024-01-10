import { createRoot } from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';
import log from 'electron-log';

import { App } from './App';
import { kernelModel } from '@shared/core';
import { networkModel } from '@entities/network';
import { notificationModel } from '@entities/notification';
import { balanceSubscriptionModel } from '@features/balances';
import { assetsModel } from '@pages/Assets/Assets/model/assets-model';
import './i18n';
import './index.css';
import './styles/theme/default.css';
import { proxiesModel } from '@features/proxies';

log.variables.version = process.env.VERSION;
log.variables.env = process.env.NODE_ENV;
log.transports.console.format = '{y}/{m}/{d} {h}:{i}:{s}.{ms} [{env}#{version}]-{processType} [{level}] > {text}';
log.transports.console.useStyles = true;

// Object.assign(console, log.functions);
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

kernelModel.events.appStarted();
networkModel.events.networkStarted();
balanceSubscriptionModel.events.balancesSubscribed();
assetsModel.events.assetsStarted();
notificationModel.events.notificationsStarted();
proxiesModel.events.proxiesStarted();

createRoot(container).render(
  <Router>
    <App />
  </Router>,
);

// NOTE: React 18 Strict mode renders twice in DEV mode
// which leads to errors in components that use camera
// https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
