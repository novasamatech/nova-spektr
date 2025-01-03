import { kernelModel } from '@/shared/core';
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
import { notificationsNavigationFeature } from '@/features/notifications-navigation';
import { operationsNavigationFeature } from '@/features/operations-navigation';
import { proxiesModel } from '@/features/proxies';
import { settingsNavigationFeature } from '@/features/settings-navigation';
import { stakingNavigationFeature } from '@/features/staking-navigation';
import { walletPairingFeature } from '@/features/wallet-pairing';
import { walletSelectFeature } from '@/features/wallet-select';
import { walletWatchOnlyFeature } from '@/features/wallet-watch-only';

import { walletPairingLedgerFeature } from 'src/renderer/features/ledger-wallet-pairing';
import { multisigWalletPairingFeature } from 'src/renderer/features/multisig-wallet-pairing';
import { polkadotVaultWalletPairingFeature } from 'src/renderer/features/polkadot-vault-wallet-pairing';
import { walletConnectWalletPairingFeature } from 'src/renderer/features/wallet-connect-wallet-pairing';
import { watchOnlyWalletPairingFeature } from 'src/renderer/features/watch-only-wallet-pairing';

export const initModel = () => {
  accounts.populate();

  walletPairingFeature.start();
  multisigWalletPairingFeature.start();
  polkadotVaultWalletPairingFeature.start();
  walletConnectWalletPairingFeature.start();
  watchOnlyWalletPairingFeature.start();
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
