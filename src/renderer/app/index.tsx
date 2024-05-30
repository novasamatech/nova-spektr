import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import { App } from './App';
import { kernelModel } from '@shared/core';
import { walletModel } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { proxyModel } from '@entities/proxy';
import { notificationModel } from '@entities/notification';
import { basketModel } from '@entities/basket';
import { proxiesModel } from '@features/proxies';
import { assetsSettingsModel } from '@features/assets';
import { multisigsModel } from '@processes/multisigs';
import { logger } from '@shared/config/utils';
import '@features/balances';
import './i18n';
import './index.css';
import './styles/theme/default.css';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root container is missing in index.html');
}

logger.init();

kernelModel.events.appStarted();
proxiesModel.events.workerStarted();
walletModel.events.walletStarted();
networkModel.events.networkStarted();
proxyModel.events.proxyStarted();
assetsSettingsModel.events.assetsStarted();
notificationModel.events.notificationsStarted();
basketModel.events.basketStarted();
multisigsModel.events.multisigsDiscoveryStarted();

createRoot(container).render(
  <HashRouter>
    <App />
  </HashRouter>,
);

// NOTE: React 18 Strict mode renders twice in DEV mode
// which leads to errors in components that use camera
// https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
