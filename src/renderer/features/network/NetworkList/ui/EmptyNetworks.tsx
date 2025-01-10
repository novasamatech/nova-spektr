import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';
import { activeNetworksModel } from '../model/active-networks-model';
import { inactiveNetworksModel } from '../model/inactive-networks-model';

export const EmptyNetworks = () => {
  const { t } = useI18n();

  const [activeNetworks, inactiveNetworks] = useUnit([
    activeNetworksModel.$activeNetworks,
    inactiveNetworksModel.$inactiveNetworks,
  ]);

  if (activeNetworks.length > 0 || inactiveNetworks.length > 0) {
    return null;
  }

  return (
    <div className="mx-auto flex flex-col items-center px-2 pb-15 pt-12">
      <Graphics name="emptyList" alt={t('settings.networks.emptyStateLabel')} size={178} />
      <BodyText className="w-52 text-center text-text-tertiary">{t('settings.networks.emptyStateLabel')}</BodyText>
    </div>
  );
};
