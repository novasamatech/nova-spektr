import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui';

import { VestedTransferModal } from './VestedTransferModal';

export const VestedTransferNavigation = memo(() => {
  const { t } = useI18n();
  const [open, toggleModal] = useToggle(false);

  return (
    <>
      <Button pallet="secondary" size="sm" onClick={toggleModal}>
        {t('navigation.vestedTransfersLabel')}
      </Button>
      {open ? <VestedTransferModal onToggle={toggleModal} /> : null}
    </>
  );
});
