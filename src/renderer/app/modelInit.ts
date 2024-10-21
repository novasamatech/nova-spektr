import { kernelModel } from '@/shared/core';
import { basketModel } from '@/entities/basket';
import { governanceModel } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyModel } from '@/entities/proxy';
import { walletModel } from '@/entities/wallet';
import { multisigsModel } from '@/processes/multisigs';
import { assetsSettingsModel } from '@/features/assets';
import { proxiesModel } from '@/features/proxies';

export const initModel = () => {
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
};
