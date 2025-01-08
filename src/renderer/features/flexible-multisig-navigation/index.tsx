import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { walletModel, walletUtils } from '@/entities/wallet';
import { navigationTopLinksPipeline } from '@/features/app-shell';
import { assetsNavigationFeature } from '@/features/assets-navigation';
import { contactsNavigationFeature } from '@/features/contacts-navigation';
import { fellowshipNavigationFeature } from '@/features/fellowship-navigation';
import { governanceNavigationFeature } from '@/features/governance-navigation';
import { navigationModel } from '@/features/navigation';
import { operationsNavigationFeature } from '@/features/operations-navigation';
import { stakingNavigationFeature } from '@/features/staking-navigation';

const isNavFeaturesReady =
  stakingNavigationFeature.isRunning &&
  operationsNavigationFeature.isRunning &&
  contactsNavigationFeature.isRunning &&
  governanceNavigationFeature.isRunning &&
  assetsNavigationFeature.isRunning &&
  fellowshipNavigationFeature.isRunning;

export const flexibleMultisigNavigationFeature = createFeature({
  name: 'flexible/navigation',
  enable: $features.map(({ flexible }) => flexible) && isNavFeaturesReady,
});

flexibleMultisigNavigationFeature.inject(navigationTopLinksPipeline, (items) => {
  const wallet = useUnit(walletModel.$activeWallet);

  if (wallet && walletUtils.isFlexibleMultisig(wallet) && !wallet.activated) {
    navigationModel.events.navigateTo(Paths.OPERATIONS);

    return items.filter((item) => item.title === 'navigation.mstOperationLabel');
  }

  return items;
});
