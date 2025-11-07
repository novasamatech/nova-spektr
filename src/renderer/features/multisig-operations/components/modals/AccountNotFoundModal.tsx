import { useUnit } from 'effector-react';
import { useTranslation } from 'react-i18next';

import { Animation } from '@/shared/ui/Animation/Animation';
import { Button } from '@/shared/ui/Buttons/Button/Button';
import { StatusModal } from '@/shared/ui/Modals/StatusModal/StatusModal';
import { deepLinkModel } from '../../model/deep-link';

export const AccountNotFoundModal = () => {
  const { t } = useTranslation();

  const isOpen = useUnit(deepLinkModel.$isAccountNotFoundModalOpen);
  const handleClose = () => deepLinkModel.closeNotFoundModal();

  return (
    <StatusModal
      isOpen={isOpen}
      title={t('operation.accountNotFoundTitle')}
      description={t('operation.accountNotFoundDescription')}
      content={<Animation variant="error" />}
      onClose={handleClose}
    >
      <Button size="sm" className="w-full" onClick={handleClose}>
        {t('operation.accountNotFoundButton')}
      </Button>
    </StatusModal>
  );
};
