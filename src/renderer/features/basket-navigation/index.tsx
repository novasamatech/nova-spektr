import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/effector';
import { Paths } from '@/shared/routes';
import { BodyText } from '@/shared/ui';
import { basketModel } from '@/entities/basket';
import { walletModel } from '@/entities/wallet';
import { navigationBottomLinksPipeline } from '@/features/app-shell';
import { basketUtils } from '@/features/operations/OperationsConfirm/lib/basket-utils';

export const basketNavigationFeature = createFeature({
  name: 'basket/navigation',
  enable: $features.map(({ basket }) => basket),
});

basketNavigationFeature.inject(navigationBottomLinksPipeline, (items) => {
  const wallet = useUnit(walletModel.$activeWallet);
  const basket = useUnit(basketModel.$basket);

  if (!wallet || !basketUtils.isBasketAvailable(wallet)) {
    return items;
  }

  return items.concat({
    order: 0,
    icon: 'operations',
    title: 'navigation.basketLabel',
    link: Paths.BASKET,
    badge: (
      <BodyText className="ml-auto text-text-tertiary">
        {basket.filter((tx) => tx.initiatorWallet === wallet?.id).length || ''}
      </BodyText>
    ),
  });
});
