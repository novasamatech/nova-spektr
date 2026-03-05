import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { BodyText } from '@/shared/ui';
import { basketUtils } from '@/entities/basket';
import { basketOperations } from '@/aggregates/basket-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { NavItem, navigationBottomLinksSlot } from '@/features/app-shell';

export const basketNavigationFeature = createFeature({
  name: 'basket/navigation',
  enable: $features.map(({ basket }) => basket),
});

basketNavigationFeature.inject(navigationBottomLinksSlot, {
  order: 1,
  render() {
    const { t } = useI18n();
    const accounts = useUnit(walletSelect.$selectedAccounts);
    const basket = useUnit(basketOperations.$list);

    const isAvailable = accounts.some(basketUtils.isBasketAvailableForAccount);

    if (!isAvailable) {
      return null;
    }

    const availableOperations = basket.filter(tx => accounts.some(a => a.accountId === tx.initiatorAccountId));

    return (
      <NavItem
        icon="basket"
        title={t('navigation.basketLabel')}
        link={Paths.BASKET}
        badge={<BodyText className="ml-auto text-text-tertiary">{availableOperations.length || ''}</BodyText>}
      ></NavItem>
    );
  },
});
