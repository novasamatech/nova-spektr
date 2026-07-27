import { kernelModel } from '@/shared/core';
import { createFeature, registerFeatures } from '@/shared/feature';
import { isWeb } from '@/shared/lib/utils';
import { config as collectivesConfig, ipfsGatewayModel, trackService } from '@/domains/collectives';
import { accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyModel } from '@/entities/proxy';
import { walletModel } from '@/entities/wallet';
import { governanceMetaProvider } from '@/aggregates/governance-meta-provider';
import { dashboardAccountSelectorFeature, operationsAccountSelectorFeature } from '@/features/account-selector';
import { assetsSettingsModel, portfolioModel } from '@/features/assets';
import { assetsNavigationFeature } from '@/features/assets-navigation';
import { basketNavigationFeature } from '@/features/basket-navigation';
import { callDataExecuteFeature } from '@/features/call-data-execute';
import { contactsNavigationFeature } from '@/features/contacts-navigation';
import { dashboardGovernanceFeature } from '@/features/dashboard-governance';
import { dashboardNavigationFeature } from '@/features/dashboard-navigation';
import { dashboardOperationsQueueFeature } from '@/features/dashboard-operations-queue';
import { dashboardPortfolioOverviewFeature } from '@/features/dashboard-portfolio-overview';
import { dashboardPriceChartsFeature } from '@/features/dashboard-price-charts';
import { dashboardStakingSummaryFeature } from '@/features/dashboard-staking';
import { dashboardStakingKpiFeature } from '@/features/dashboard-staking-kpi';
import { dashboardStakingPositionsFeature } from '@/features/dashboard-staking-positions';
import { dashboardStakingRewardsChartFeature } from '@/features/dashboard-staking-rewards-chart';
import { fellowshipNavigationFeature } from '@/features/fellowship-navigation';
import { governanceNavigationFeature } from '@/features/governance-navigation';
import { multiTransferFeature } from '@/features/multi-transfer';
import { notificationsNavigationFeature } from '@/features/notifications-navigation';
import { operationsNavigationFeature } from '@/features/operations-navigation';
import { settingsNavigationFeature } from '@/features/settings-navigation';
import { stakingNavigationFeature } from '@/features/staking-navigation';
import { vestedTransferFeature } from '@/features/vested-transfer';
import { vestingClaimFeature } from '@/features/vesting-claim';

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
  networkModel.startNetworks();
  accounts.populate();
  walletModel.populate();
  proxyModel.populate();
  governanceMetaProvider.populate();
  portfolioModel.populate();
  balanceModel.populate();
  ipfsGatewayModel.populate();

  // TODO rework as populate effects
  kernelModel.events.appStarted();
  assetsSettingsModel.events.assetsStarted();
  notificationModel.events.notificationsStarted();
};

export const bootstrap = () => {
  const config = configureDomains();

  registerFeatures([
    config,

    dashboardNavigationFeature,
    dashboardAccountSelectorFeature,
    operationsAccountSelectorFeature,
    dashboardPortfolioOverviewFeature,
    dashboardPriceChartsFeature,
    dashboardOperationsQueueFeature,
    dashboardGovernanceFeature,
    dashboardStakingSummaryFeature,
    dashboardStakingKpiFeature,
    dashboardStakingPositionsFeature,
    dashboardStakingRewardsChartFeature,
    assetsNavigationFeature,
    fellowshipNavigationFeature,
    operationsNavigationFeature,
    contactsNavigationFeature,
    callDataExecuteFeature,
    notificationsNavigationFeature,
    settingsNavigationFeature,
    basketNavigationFeature,
    stakingNavigationFeature,
    governanceNavigationFeature,
    vestedTransferFeature,
    vestingClaimFeature,
    multiTransferFeature,
    import('@/features/app-custom-operations').then(({ appCustomOperationsFeature }) => appCustomOperationsFeature),

    import('@/features/wallet-select').then(({ walletSelectFeature }) => walletSelectFeature.feature),
    import('@/features/wallet-details').then(({ walletDetailsFeature }) => walletDetailsFeature),
    import('@/features/wallet-pairing').then(({ walletPairingFeature }) => walletPairingFeature),

    import('@/features/account-sync').then(({ accountSyncFeature }) => accountSyncFeature),
    import('@/features/hide-unnamed-wallets').then(({ hideUnnamedWalletsFeature }) => hideUnnamedWalletsFeature),

    import('@/features/multisig-wallet').then(({ multisigWalletFeature }) => multisigWalletFeature),
    import('@/features/multisig-wallet-create').then(({ multisigWalletPairingFeature }) => multisigWalletPairingFeature),

    import('@/features/polkadot-vault-wallet').then(({ polkadotVaultWalletFeature }) => polkadotVaultWalletFeature),
    import('@/features/polkadot-vault-wallet-pairing').then(({ polkadotVaultWalletPairingFeature }) => polkadotVaultWalletPairingFeature),

    import('@/features/wallet-connect-wallet').then(({ walletConnectWalletFeature }) => walletConnectWalletFeature),
    import('@/features/wallet-connect-wallet-pairing').then(({ walletConnectWalletPairingFeature }) => walletConnectWalletPairingFeature),

    import('@/features/watch-only-wallet').then(({ watchOnlyWalletFeature }) => watchOnlyWalletFeature),
    import('@/features/watch-only-wallet-pairing').then(({ watchOnlyWalletPairingFeature }) => watchOnlyWalletPairingFeature),

    import('@/features/extension-wallet').then(({ extensionWalletFeature }) => extensionWalletFeature),

    import('@/features/ledger-wallet-pairing').then(({ ledgerWalletPairingFeature }) => ledgerWalletPairingFeature),

    import('@/features/proxied-wallet').then(({ proxiedWalletFeature }) => proxiedWalletFeature),

    import('@/features/accounts-structure').then(({ accountsStructureFeature }) => accountsStructureFeature),

    import('@/features/multisig-operations').then(({ multisigOperationsFeature }) => multisigOperationsFeature),

    import('@/features/fellowship-activity-feed').then(({ fellowshipActivityFeedFeature }) => fellowshipActivityFeedFeature),
    import('@/features/fellowship-basket').then(({ fellowshipBasketFeature }) => fellowshipBasketFeature),
    import('@/features/fellowship-evidence-salary').then(({ fellowshipEvidenceSalaryFeature }) => fellowshipEvidenceSalaryFeature),
    import('@/features/fellowship-evidence').then(({ fellowshipEvidenceFeature }) => fellowshipEvidenceFeature),
    import('@/features/fellowship-salary').then(({ fellowshipSalaryFeature }) => fellowshipSalaryFeature),
    import('@/features/fellowship-members').then(({ fellowshipMembersFeature }) => fellowshipMembersFeature),
    import('@/features/fellowship-profile').then(({ fellowshipProfileFeature }) => fellowshipProfileFeature),
    import('@/features/fellowship-referendum-details').then(({ fellowshipReferendumsDetailsFeature }) => fellowshipReferendumsDetailsFeature),
    import('@/features/fellowship-tasks').then(({ fellowshipTasksFeature }) => fellowshipTasksFeature),
    import('@/features/fellowship-voting').then(({ fellowshipVotingFeature }) => fellowshipVotingFeature),
    import('@/features/fellowship-voting-history').then(({ fellowshipVotingHistoryFeature }) => fellowshipVotingHistoryFeature),
    import('@/features/fellowship-overview').then(({ fellowshipOverviewFeature }) => fellowshipOverviewFeature),

    import('@/features/basket-operations').then(({ basketOperationsFeature }) => basketOperationsFeature),

    import('@/features/governance-operation-details').then(({ governanceOperationDetailFeature }) => governanceOperationDetailFeature),
    import('@/features/governance-basket').then(({ governanceBasketFeature }) => governanceBasketFeature),

    import('@/features/transfer-operation-details').then(({ transferOperationDetailFeature }) => transferOperationDetailFeature),
    import('@/features/transfer-basket').then(({ transferBasketFeature }) => transferBasketFeature),

    import('@/features/staking-operation-details').then(({ stakingOperationDetailFeature }) => stakingOperationDetailFeature),
    import('@/features/staking-basket').then(({ stakingBasketFeature }) => stakingBasketFeature),

    import('@/features/staking-claim-rewards').then(({ stakingClaimRewardsFeature }) => stakingClaimRewardsFeature),
    import('@/features/staking-amount-flow').then(({ stakingAmountFlowFeature }) => stakingAmountFlowFeature),
    import('@/features/staking-confirm-flow').then(({ stakingConfirmFlowFeature }) => stakingConfirmFlowFeature),
    import('@/features/staking-dashboard-actions').then(({ stakingDashboardActionsFeature }) => stakingDashboardActionsFeature),

    import('@/features/staking-unstake').then(({ stakingUnstakeFeature }) => stakingUnstakeFeature),
    import('@/features/staking-withdraw').then(({ stakingWithdrawFeature }) => stakingWithdrawFeature),
    import('@/features/staking-bond-extra').then(({ stakingBondExtraFeature }) => stakingBondExtraFeature),
    import('@/features/staking-restake').then(({ stakingRestakeFeature }) => stakingRestakeFeature),
    import('@/features/staking-payee').then(({ stakingPayeeFeature }) => stakingPayeeFeature),
    import('@/features/staking-nominate').then(({ stakingNominateFeature }) => stakingNominateFeature),
    import('@/features/staking-bond-nominate').then(({ stakingBondNominateFeature }) => stakingBondNominateFeature),

    import('@/features/flexible-operation-details').then(({ flexibleOperationDetailFeature }) => flexibleOperationDetailFeature),

    import('@/features/proxy-operation-details').then(({ proxyOperationDetailFeature }) => proxyOperationDetailFeature),
    import('@/features/proxy-basket').then(({ proxyBasketFeature }) => proxyBasketFeature),

    import('@/features/vested-transfer-operation-details').then(({ vestedTransferOperationDetailFeature }) => vestedTransferOperationDetailFeature),
    import('@/features/multi-transfer-operation-details').then(({ multiTransferOperationDetailFeature }) => multiTransferOperationDetailFeature),

    import('@/features/import-db').then(({ importDBFeature }) => importDBFeature),
    import('@/features/hidden-wallets').then(({ hiddenWalletsFeature }) => hiddenWalletsFeature),
    import('@/features/notifications').then(({ notificationsSettingsFeature }) => notificationsSettingsFeature),
    import('@/features/currency').then(({ currencyFeature }) => currencyFeature),

    import('@/features/fellowship-promotion').then(({ fellowshipPromotionFeature }) => fellowshipPromotionFeature),
    import('@/features/fellowship-retention').then(({ fellowshipRetentionFeature }) => fellowshipRetentionFeature),
    import('@/features/assethub-migration-modal').then(({ assethubMigrationModalFeature }) => assethubMigrationModalFeature),
    import('@/features/dapp-browser').then(({ dappBrowserFeature }) => dappBrowserFeature),
    import('@/features/drafts').then(({ draftsFeature }) => draftsFeature),
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
