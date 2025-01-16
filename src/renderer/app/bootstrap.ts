/* eslint-disable import-x/max-dependencies */

import { kernelModel } from '@/shared/core';
import { createFeature, registerFeatures } from '@/shared/feature';
import { config as collectivesConfig, tracksService } from '@/domains/collectives';
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
import { governanceOperationDetailFeature } from '@/features/governance-operation-details';
import { importDBFeature } from '@/features/import-db';
import { multisigOperationDetailsFeature } from '@/features/multisig-operation-details';
import { notificationsNavigationFeature } from '@/features/notifications-navigation';
import { operationsNavigationFeature } from '@/features/operations-navigation';
import { polkadotExtensionWalletFeature } from '@/features/polkadot-extension-wallet';
import { proxiesModel } from '@/features/proxies';
import { proxyOperationDetailFeature } from '@/features/proxy-operation-details';
import { settingsNavigationFeature } from '@/features/settings-navigation';
import { stakingNavigationFeature } from '@/features/staking-navigation';
import { stakingOperationDetailFeature } from '@/features/staking-operation-details';
import { transferOperationDetailFeature } from '@/features/transfer-operation-details';
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

const configureDomains = () => {
  const app = createFeature({ name: 'spektr/config' });

  app.inject(collectivesConfig.calculateVoteWeightPipeline, (defaultValue, { pallet, excessRank }) => {
    if (pallet === 'fellowship') {
      return tracksService.getGeometricVoteWeight(excessRank);
    }

    if (pallet === 'ambassador') {
      return tracksService.getLinearVoteWeight(excessRank);
    }

    return defaultValue;
  });

  app.start();
};

const populate = () => {
  accounts.populate();
  walletModel.populate();

  // TODO rework as populate effects
  kernelModel.events.appStarted();
  governanceModel.events.governanceStarted();
  proxiesModel.events.workerStarted();
  networkModel.events.networkStarted();
  proxyModel.events.proxyStarted();
  assetsSettingsModel.events.assetsStarted();
  notificationModel.events.notificationsStarted();
  basketModel.events.basketStarted();
  multisigsModel.events.subscribe();
};

export const bootstrap = () => {
  configureDomains();
  populate();

  registerFeatures([
    assetsNavigationFeature,
    stakingNavigationFeature,
    governanceNavigationFeature,
    fellowshipNavigationFeature,
    operationsNavigationFeature,
    contactsNavigationFeature,
    notificationsNavigationFeature,
    basketNavigationFeature,
    settingsNavigationFeature,
    flexibleMultisigNavigationFeature,

    walletSelectFeature.feature,
    walletDetailsFeature,

    walletPairingFeature,
    walletPairingMultisigFeature,
    walletPairingPolkadotVaultFeature,
    walletPairingWalletConnectFeature,
    walletPairingWatchOnlyFeature,
    walletPairingLedgerFeature,

    walletMultisigFeature,
    walletProxiedFeature,
    walletPolkadotVaultFeature,
    walletWalletConnectFeature,
    walletWatchOnlyFeature,
    polkadotExtensionWalletFeature,

    governanceOperationDetailFeature,
    multisigOperationDetailsFeature,
    proxyOperationDetailFeature,
    stakingOperationDetailFeature,
    transferOperationDetailFeature,

    importDBFeature,
  ]);
};
