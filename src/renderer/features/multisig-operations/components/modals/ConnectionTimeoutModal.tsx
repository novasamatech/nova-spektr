import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Animation } from '@/shared/ui/Animation/Animation';
import { Button } from '@/shared/ui/Buttons/Button/Button';
import { StatusModal } from '@/shared/ui/Modals/StatusModal/StatusModal';
import { deepLinkModel } from '../../model/deep-link';

export const ConnectionTimeoutModal = () => {
  const { t } = useI18n();

  const isOpen = useUnit(deepLinkModel.$isConnectionTimeoutModalOpen);
  const handleClose = () => deepLinkModel.closeConnectionTimeoutModal();
  const handleRetry = () => deepLinkModel.retryConnectionTimeout();

  return (
    <StatusModal
      isOpen={isOpen}
      title={t('operation.connectionTimeoutTitle')}
      description={t('operation.connectionTimeoutDescription')}
      content={<Animation variant="error" />}
      onClose={handleClose}
    >
      <div className="flex w-full gap-2">
        <Button size="sm" variant="text" className="flex-1" onClick={handleClose}>
          {t('operation.connectionTimeoutButton')}
        </Button>
        <Button size="sm" className="flex-1" onClick={handleRetry}>
          {t('operation.connectionTimeoutRetryButton')}
        </Button>
      </div>
    </StatusModal>
  );
};
