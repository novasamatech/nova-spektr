import { kernelModel } from '@/shared/core';
import { registerFeatures } from '@/shared/effector';
import { accounts } from '@/domains/network';
import { basketModel } from '@/entities/basket';
import { governanceModel } from '@/entities/governance';
import { multisigsModel } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyModel } from '@/entities/proxy';
import { walletModel } from '@/entities/wallet';
import { assetsSettingsModel } from '@/features/assets';
import { assetsNavigationFeature } from '@/features/assets-navigation';
import { basketNavigationFeature } from '@/features/basket-navigation';
import { contactsNavigationFeature } from '@/features/contacts-navigation';
import { fellowshipNavigationFeature } from '@/features/fellowship-navigation';
import { flexibleMultisigNavigationFeature } from '@/features/flexible-multisig-navigation';
import { governanceNavigationFeature } from '@/features/governance-navigation';
import { walletPairingMultisigFeature } from '@/features/multisig-wallet-pairing';
import { notificationsNavigationFeature } from '@/features/notifications-navigation';
import { operationsNavigationFeature } from '@/features/operations-navigation';
import { proxiesModel } from '@/features/proxies';
import { settingsNavigationFeature } from '@/features/settings-navigation';
import { stakingNavigationFeature } from '@/features/staking-navigation';
import { walletPairingFeature } from '@/features/wallet-pairing';
import { walletPairingLedgerFeature } from '@/features/wallet-pairing-ledger';
import { walletPairingPolkadotVaultFeature } from '@/features/wallet-pairing-polkadot-vault';
import { walletPairingWalletConnectFeature } from '@/features/wallet-pairing-wallet-connect';
import { walletPairingWatchOnlyFeature } from '@/features/wallet-pairing-watch-only';
import { walletSelectFeature } from '@/features/wallet-select';
import { walletWatchOnlyFeature } from '@/features/wallet-watch-only';

export const initModel = () => {
  registerFeatures([
    assetsNavigationFeature,
    stakingNavigationFeature,
    governanceNavigationFeature,
    fellowshipNavigationFeature,
    operationsNavigationFeature,
    contactsNavigationFeature,
    notificationsNavigationFeature,
    settingsNavigationFeature,
    walletSelectFeature.feature,
  ]);

  accounts.populate();

  walletPairingFeature.start();
  walletPairingMultisigFeature.start();
  walletPairingPolkadotVaultFeature.start();
  walletPairingWalletConnectFeature.start();
  walletPairingWatchOnlyFeature.start();
  walletPairingLedgerFeature.start();

  walletWatchOnlyFeature.start();

  assetsNavigationFeature.start();
  stakingNavigationFeature.start();
  governanceNavigationFeature.start();
  fellowshipNavigationFeature.start();
  operationsNavigationFeature.start();
  contactsNavigationFeature.start();
  notificationsNavigationFeature.start();
  settingsNavigationFeature.start();
  basketNavigationFeature.start();
  flexibleMultisigNavigationFeature.start();

  walletSelectFeature.feature.start();

  kernelModel.events.appStarted();
  governanceModel.events.governanceStarted();
  proxiesModel.events.workerStarted();
  walletModel.events.walletStarted();
  networkModel.events.networkStarted();
  proxyModel.events.proxyStarted();
  assetsSettingsModel.events.assetsStarted();
  notificationModel.events.notificationsStarted();
  basketModel.events.basketStarted();
  multisigsModel.events.subscribe();
};
