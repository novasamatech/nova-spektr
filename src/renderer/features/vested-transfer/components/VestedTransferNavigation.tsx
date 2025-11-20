import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Dropdown } from '@/shared/ui-kit';

import { VestedTransferModal } from './VestedTransferModal';

export const VestedTransferNavigation = memo(() => {
  const { t } = useI18n();
  const [isOpen, toggleModal] = useToggle(false);

  return (
    <>
      <Dropdown.Item onClick={toggleModal}>{t('navigation.vestedTransfersLabel')}</Dropdown.Item>
      <VestedTransferModal isOpen={isOpen} onToggle={toggleModal} />
    </>
  );
});
