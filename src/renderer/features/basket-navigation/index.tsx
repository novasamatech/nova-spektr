import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { BodyText } from '@/shared/ui';
import { basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { NavItem, navigationBottomLinksSlot } from '@/features/app-shell';
import { basketUtils } from '@/features/operations/OperationsConfirm/lib/basket-utils';

export const basketNavigationFeature = createFeature({
  name: 'basket/navigation',
  enable: $features.map(({ basket }) => basket),
});

basketNavigationFeature.inject(navigationBottomLinksSlot, {
  order: 0,
  render() {
    const { t } = useI18n();
    const wallet = useUnit(walletSelect.$selectedWallet);
    const basket = useUnit(basketOperations.$list);

    if (!wallet || !basketUtils.isBasketAvailable(wallet)) {
      return null;
    }

    return (
      <NavItem
        icon="operations"
        title={t('navigation.basketLabel')}
        link={Paths.BASKET}
        badge={
          <BodyText className="ml-auto text-text-tertiary">
            {basket.filter((tx) => tx.initiatorWallet === wallet?.id).length || ''}
          </BodyText>
        }
      ></NavItem>
    );
  },
});
