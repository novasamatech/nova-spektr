import { useUnit } from 'effector-react';

import { $features } from '@/shared/config/features';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { BodyText } from '@/shared/ui';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { NavItem, navigationBottomLinksSlot } from '@/features/app-shell';

export const operationsNavigationFeature = createFeature({
  name: 'operations/navigation',
  enable: $features.map(({ operations }) => operations),
});

operationsNavigationFeature.inject(navigationBottomLinksSlot, {
  order: 0,
  render() {
    const { t } = useI18n();

    const operations = useUnit(selectedWalletMultisigOperations.$list);
    const pending = operations.filter((t) => t.status === 'pending');

    return (
      <NavItem
        icon="operations"
        title={t('navigation.mstOperationLabel')}
        link={Paths.OPERATIONS}
        badge={pending.length > 0 ? <BodyText className="ml-auto text-text-tertiary">{pending.length}</BodyText> : null}
      ></NavItem>
    );
  },
});
