/* eslint-disable import-x/max-dependencies */

import { kernelModel } from '@/shared/core';
import { createFeature, registerFeatures } from '@/shared/feature';
import { isWeb } from '@/shared/lib/utils';
import { config as collectivesConfig, trackService } from '@/domains/collectives';
import { accounts, registry } from '@/domains/network';
import { multisigsModel } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyModel } from '@/entities/proxy';
import { walletModel } from '@/entities/wallet';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';
import { assetsSettingsModel } from '@/features/assets';
import { assetsNavigationFeature } from '@/features/assets-navigation';
import { basketNavigationFeature } from '@/features/basket-navigation';
import { basketOperationsFeature } from '@/features/basket-operations';
import { contactsNavigationFeature } from '@/features/contacts-navigation';
import { extensionWalletFeature } from '@/features/extension-wallet';
import { fellowshipActivityFeedFeature } from '@/features/fellowship-activity-feed';
import { fellowshipBasketFeature } from '@/features/fellowship-basket';
import { fellowshipSalaryFeature } from '@/features/fellowship-evidence-salary';
import { fellowshipMembersFeature } from '@/features/fellowship-members';
import { fellowshipNavigationFeature } from '@/features/fellowship-navigation';
import { fellowshipProfileFeature } from '@/features/fellowship-profile';
import { fellowshipReferendumsDetailsFeature } from '@/features/fellowship-referendum-details';
import { fellowshipTasksFeature } from '@/features/fellowship-tasks';
import { fellowshipVotingFeature } from '@/features/fellowship-voting';
import { flexibleMultisigNavigationFeature } from '@/features/flexible-multisig-navigation';
import { governanceBasketFeature } from '@/features/governance-basket';
import { governanceNavigationFeature } from '@/features/governance-navigation';
import { governanceOperationDetailFeature } from '@/features/governance-operation-details';
import { importDBFeature } from '@/features/import-db';
import { ledgerWalletPairingFeature } from '@/features/ledger-wallet-pairing';
import { multisigOperationDetailsFeature } from '@/features/multisig-operation-details';
import { multisigWalletFeature } from '@/features/multisig-wallet';
import { multisigWalletPairingFeature } from '@/features/multisig-wallet-pairing';
import { notificationsNavigationFeature } from '@/features/notifications-navigation';
import { operationsNavigationFeature } from '@/features/operations-navigation';
import { polkadotVaultWalletFeature } from '@/features/polkadot-vault-wallet';
import { polkadotVaultWalletPairingFeature } from '@/features/polkadot-vault-wallet-pairing';
import { proxiedWalletFeature } from '@/features/proxied-wallet';
import { proxiesModel } from '@/features/proxies';
import { proxyBasketFeature } from '@/features/proxy-basket';
import { proxyOperationDetailFeature } from '@/features/proxy-operation-details';
import { settingsNavigationFeature } from '@/features/settings-navigation';
import { stakingBasketFeature } from '@/features/staking-basket';
import { stakingNavigationFeature } from '@/features/staking-navigation';
import { stakingOperationDetailFeature } from '@/features/staking-operation-details';
import { transferBasketFeature } from '@/features/transfer-basket';
import { transferOperationDetailFeature } from '@/features/transfer-operation-details';
import { walletConnectWalletFeature } from '@/features/wallet-connect-wallet';
import { walletConnectWalletPairingFeature } from '@/features/wallet-connect-wallet-pairing';
import { walletDetailsFeature } from '@/features/wallet-details';
import { walletPairingFeature } from '@/features/wallet-pairing';
import { walletSelectFeature } from '@/features/wallet-select';
import { watchOnlyWalletFeature } from '@/features/watch-only-wallet';
import { watchOnlyWalletPairingFeature } from '@/features/watch-only-wallet-pairing';

const configureDomains = () => {
  const config = createFeature({ name: 'spektr/config' });

  config.inject(collectivesConfig.calculateVoteWeightPipeline, (defaultValue, { pallet, excessRank }) => {
    if (pallet === 'fellowship') {
      return trackService.getGeometricVoteWeight(excessRank);
    }

    if (pallet === 'ambassador') {
      return trackService.getLinearVoteWeight(excessRank);
    }

    return defaultValue;
  });

  return config;
};

const populate = async () => {
  registry.startNetworks();
  await networkModel.startNetworks();
  await accounts.populate();
  await walletModel.populate();
  multisigsModel.subscribe();
  await proxyModel.populate();

  governanceMetaProvider.populate();

  // TODO rework as populate effects
  kernelModel.events.appStarted();
  assetsSettingsModel.events.assetsStarted();
  notificationModel.events.notificationsStarted();
  proxiesModel.findAllProxies();
};

export const bootstrap = () => {
  const config = configureDomains();

  registerFeatures([
    config,

    assetsNavigationFeature,
    operationsNavigationFeature,
    contactsNavigationFeature,
    notificationsNavigationFeature,
    settingsNavigationFeature,
    flexibleMultisigNavigationFeature,

    fellowshipActivityFeedFeature,
    fellowshipMembersFeature,
    fellowshipNavigationFeature,
    fellowshipProfileFeature,
    fellowshipReferendumsDetailsFeature,
    fellowshipSalaryFeature,
    fellowshipTasksFeature,
    fellowshipVotingFeature,
    fellowshipBasketFeature,

    walletSelectFeature.feature,
    walletDetailsFeature,

    walletPairingFeature,

    multisigWalletFeature,
    multisigWalletPairingFeature,

    polkadotVaultWalletFeature,
    polkadotVaultWalletPairingFeature,

    walletConnectWalletFeature,
    walletConnectWalletPairingFeature,

    watchOnlyWalletFeature,
    watchOnlyWalletPairingFeature,

    extensionWalletFeature,

    ledgerWalletPairingFeature,

    proxiedWalletFeature,

    basketNavigationFeature,
    basketOperationsFeature,

    governanceNavigationFeature,
    governanceBasketFeature,
    governanceOperationDetailFeature,

    multisigOperationDetailsFeature,

    transferOperationDetailFeature,
    transferBasketFeature,

    stakingNavigationFeature,
    stakingOperationDetailFeature,
    stakingBasketFeature,

    proxyOperationDetailFeature,
    proxyBasketFeature,

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
