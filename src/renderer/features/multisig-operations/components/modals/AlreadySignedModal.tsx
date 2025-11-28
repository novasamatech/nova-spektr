import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Animation } from '@/shared/ui/Animation/Animation';
import { Button } from '@/shared/ui/Buttons/Button/Button';
import { StatusModal } from '@/shared/ui/Modals/StatusModal/StatusModal';
import { deepLinkModel } from '../../model/deep-link';

export const AlreadySignedModal = () => {
  const { t } = useI18n();

  const isOpen = useUnit(deepLinkModel.$isAlreadySignedModalOpen);
  const handleClose = () => deepLinkModel.closeAlreadySignedModal();
  const handleView = () => deepLinkModel.viewAlreadySignedOperation();

  return (
    <StatusModal
      isOpen={isOpen}
      title={t('operation.alreadySignedTitle')}
      content={<Animation variant="success" />}
      onClose={handleClose}
    >
      <Button pallet="secondary" size="sm" className="flex-1" onClick={handleClose}>
        {t('operation.alreadySignedCloseButton')}
      </Button>
      <Button variant="fill" size="sm" className="flex-1" onClick={handleView}>
        {t('operation.alreadySignedViewButton')}
      </Button>
    </StatusModal>
  );
};
