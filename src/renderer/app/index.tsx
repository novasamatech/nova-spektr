import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';

import { logger } from '@shared/config/utils';
import { kernelModel } from '@shared/core';

import { basketModel } from '@entities/basket';
import { governanceModel } from '@entities/governance';
import { networkModel } from '@entities/network';
import { notificationModel } from '@entities/notification';
import { proxyModel } from '@entities/proxy';
import { walletModel } from '@entities/wallet';

import { multisigsModel } from '@processes/multisigs';

import { assetsSettingsModel } from '@features/assets';
import { proxiesModel } from '@features/proxies';

import { App } from './App';
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
governanceModel.events.governanceStarted();
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
