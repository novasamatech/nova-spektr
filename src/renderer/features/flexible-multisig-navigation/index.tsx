import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { walletModel, walletUtils } from '@/entities/wallet';
import { navigationTopLinksPipeline } from '@/features/app-shell';
import { navigationModel } from '@/features/navigation';

export const flexibleMultisigNavigationFeature = createFeature({
  name: 'flexible/navigation',
  enable: $features.map(({ operations }) => operations),
});

flexibleMultisigNavigationFeature.inject(navigationTopLinksPipeline, (items) => {
  const wallet = useUnit(walletModel.$activeWallet);

  //TODO check what to use here after linking proxy and flexible
  if (walletUtils.isFlexibleMultisig(wallet) && !wallet.accounts.at(0)?.proxyAccountId) {
    navigationModel.events.navigateTo(Paths.OPERATIONS);

    return items.filter((item) => item.title === 'navigation.mstOperationLabel');
  }

  return items;
});
