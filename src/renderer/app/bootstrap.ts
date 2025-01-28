/* eslint-disable import-x/max-dependencies */

import { kernelModel } from '@/shared/core';
import { createFeature, registerFeatures } from '@/shared/feature';
import { isWeb } from '@/shared/lib/utils';
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
import { extensionWalletFeature } from '@/features/extension-wallet';
import { fellowshipActivityFeedFeature } from '@/features/fellowship-activity-feed';
import { fellowshipMembersFeature } from '@/features/fellowship-members';
import { fellowshipNavigationFeature } from '@/features/fellowship-navigation';
import { fellowshipProfileFeature } from '@/features/fellowship-profile';
import { fellowshipSalaryFeature } from '@/features/fellowship-salary';
import { fellowshipTasksFeature } from '@/features/fellowship-tasks';
import { flexibleMultisigNavigationFeature } from '@/features/flexible-multisig-navigation';
import { governanceNavigationFeature } from '@/features/governance-navigation';
import { governanceOperationDetailFeature } from '@/features/governance-operation-details';
import { importDBFeature } from '@/features/import-db';
import { multisigOperationDetailsFeature } from '@/features/multisig-operation-details';
import { notificationsNavigationFeature } from '@/features/notifications-navigation';
import { operationsNavigationFeature } from '@/features/operations-navigation';
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
  const config = createFeature({ name: 'spektr/config' });

  config.inject(collectivesConfig.calculateVoteWeightPipeline, (defaultValue, { pallet, excessRank }) => {
    if (pallet === 'fellowship') {
      return tracksService.getGeometricVoteWeight(excessRank);
    }

    if (pallet === 'ambassador') {
      return tracksService.getLinearVoteWeight(excessRank);
    }

    return defaultValue;
  });

  return config;
};

const populate = async () => {
  await networkModel.startNetworks();
  await accounts.populate();
  await walletModel.populate();
  proxiesModel.findAllProxies();
  multisigsModel.subscribe();

  // TODO rework as populate effects
  kernelModel.events.appStarted();
  governanceModel.events.governanceStarted();
  proxyModel.events.proxyStarted();
  assetsSettingsModel.events.assetsStarted();
  notificationModel.events.notificationsStarted();
  basketModel.events.basketStarted();
};

export const bootstrap = () => {
  const config = configureDomains();

  registerFeatures([
    config,

    assetsNavigationFeature,
    stakingNavigationFeature,
    governanceNavigationFeature,
    operationsNavigationFeature,
    contactsNavigationFeature,
    notificationsNavigationFeature,
    basketNavigationFeature,
    settingsNavigationFeature,
    flexibleMultisigNavigationFeature,

    fellowshipNavigationFeature,
    fellowshipTasksFeature,
    fellowshipSalaryFeature,
    fellowshipProfileFeature,
    fellowshipMembersFeature,
    fellowshipActivityFeedFeature,

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
    extensionWalletFeature,

    governanceOperationDetailFeature,
    multisigOperationDetailsFeature,
    proxyOperationDetailFeature,
    stakingOperationDetailFeature,
    transferOperationDetailFeature,

    importDBFeature,
  ]);

  populate();
  persist();
};

const persist = () => {
  if (isWeb() && navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then((persistent) => {
      if (persistent) {
        console.info('Storage will not be cleared except by explicit user action');
      } else {
        console.info('Storage may be cleared by the UA under storage pressure.');
      }
    });
  }
};
