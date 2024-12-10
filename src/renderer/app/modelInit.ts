import { kernelModel } from '@/shared/core';
import { basketModel } from '@/entities/basket';
import { governanceModel } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyModel } from '@/entities/proxy';
import { walletModel } from '@/entities/wallet';
import { multisigsModel } from '@/processes/multisigs';
import { assetsSettingsModel } from '@/features/assets';
import { assetsNavigationFeature } from '@/features/assets-navigation';
import { basketNavigationFeature } from '@/features/basket-navigation';
import { contactsNavigationFeature } from '@/features/contacts-navigation';
import { fellowshipNavigationFeature } from '@/features/fellowship-navigation';
import { governanceNavigationFeature } from '@/features/governance-navigation';
import { notificationsNavigationFeature } from '@/features/notifications-navigation';
import { operationsNavigationFeature } from '@/features/operations-navigation';
import { proxiesModel } from '@/features/proxies';
import { settingsNavigationFeature } from '@/features/settings-navigation';
import { stakingNavigationFeature } from '@/features/staking-navigation';
import { walletsSelectFeature } from '@/features/wallets-select';

export const initModel = () => {
  assetsNavigationFeature.start();
  stakingNavigationFeature.start();
  governanceNavigationFeature.start();
  fellowshipNavigationFeature.start();
  operationsNavigationFeature.start();
  contactsNavigationFeature.start();
  notificationsNavigationFeature.start();
  settingsNavigationFeature.start();
  basketNavigationFeature.start();

  walletsSelectFeature.start();

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
