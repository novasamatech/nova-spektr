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
import { importDBFeature } from '@/features/import-db';
import { notificationsNavigationFeature } from '@/features/notifications-navigation';
import { operationsNavigationFeature } from '@/features/operations-navigation';
import { proxiesModel } from '@/features/proxies';
import { settingsNavigationFeature } from '@/features/settings-navigation';
import { stakingNavigationFeature } from '@/features/staking-navigation';
import { walletDetailsFeature } from '@/features/wallet-details';
import { walletMultisigFeature } from '@/features/wallet-multisig';
import { walletPairingFeature } from '@/features/wallet-pairing';
import { walletPairingLedgerFeature } from '@/features/wallet-pairing-ledger';
import { walletPairingMultisigFeature } from '@/features/wallet-pairing-multisig';
import { walletPairingPolkadotVaultFeature } from '@/features/wallet-pairing-polkadot-vault';
import { walletPairingWalletConnectFeature } from '@/features/wallet-pairing-wallet-connect';
import { walletPairingWatchOnlyFeature } from '@/features/wallet-pairing-watch-only';
import { walletPolkadotVaultFeature } from '@/features/wallet-polkadot-vault';
import { walletProxiedFeature } from '@/features/wallet-proxied';
import { walletSelectFeature } from '@/features/wallet-select';
import { walletWalletConnectFeature } from '@/features/wallet-wallet-connect';
import { walletWatchOnlyFeature } from '@/features/wallet-watch-only';

export const initModel = () => {
  accounts.populate();

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
    walletDetailsFeature,

    walletPairingFeature,
    walletPairingMultisigFeature,
    walletPairingPolkadotVaultFeature,
    walletPairingWalletConnectFeature,
    walletPairingWatchOnlyFeature,
    walletPairingLedgerFeature,

    walletDetailsFeature,
    walletMultisigFeature,
    walletProxiedFeature,
    walletPolkadotVaultFeature,
    walletWalletConnectFeature,
    walletWatchOnlyFeature,
  ]);

  walletPairingFeature.start();
  walletPairingMultisigFeature.start();
  walletPairingPolkadotVaultFeature.start();
  walletPairingWalletConnectFeature.start();
  walletPairingWatchOnlyFeature.start();
  walletPairingLedgerFeature.start();
  importDBFeature.start();

  walletProxiedFeature.start();
  walletMultisigFeature.start();
  walletPolkadotVaultFeature.start();
  walletWalletConnectFeature.start();
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
};
