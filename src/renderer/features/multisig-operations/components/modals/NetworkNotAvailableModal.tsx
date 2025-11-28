import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Animation } from '@/shared/ui/Animation/Animation';
import { Button } from '@/shared/ui/Buttons/Button/Button';
import { StatusModal } from '@/shared/ui/Modals/StatusModal/StatusModal';
import { deepLinkModel } from '../../model/deep-link';

export const NetworkNotAvailableModal = () => {
  const { t } = useI18n();

  const isOpen = useUnit(deepLinkModel.$isNetworkNotAvailableModalOpen);
  const handleClose = () => deepLinkModel.closeNetworkNotAvailableModal();

  return (
    <StatusModal
      isOpen={isOpen}
      title={t('operation.networkNotAvailableTitle')}
      content={<Animation variant="error" />}
      onClose={handleClose}
    >
      <Button size="sm" className="w-full" onClick={handleClose}>
        {t('operation.networkNotAvailableButton')}
      </Button>
    </StatusModal>
  );
};
