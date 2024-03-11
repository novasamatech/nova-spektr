import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import log from 'electron-log';

import { App } from './App';
import { kernelModel } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { proxyModel } from '@entities/proxy';
import { notificationModel } from '@entities/notification';
import { balanceSubModel } from '@features/balances';
import { proxiesModel } from '@features/proxies';
import { assetsModel } from '@pages/Assets/Assets/model/assets-model';
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
  onError({ error }) {
    console.error('Uncaught error', error);
  },
});

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container is missing in index.html');
}

kernelModel.events.appStarted();
proxiesModel.events.workerStarted();
walletModel.events.walletStarted();
networkModel.events.networkStarted();
proxyModel.events.proxyStarted();
balanceSubModel.events.balancesSubStarted();
assetsModel.events.assetsStarted();
notificationModel.events.notificationsStarted();

createRoot(container).render(
  <HashRouter>
    <App />
  </HashRouter>,
);

// NOTE: React 18 Strict mode renders twice in DEV mode
// which leads to errors in components that use camera
// https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
