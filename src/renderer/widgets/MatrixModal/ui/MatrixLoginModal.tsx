import { useEffect } from 'react';

import { useI18n } from '@app/providers';
import { BaseModal } from '@shared/ui';
import { MatrixInfoPopover } from './MatrixInfoPopover';
import { LoginForm } from './LoginForm';
import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';

type Props = {
  isOpen?: boolean;
  zIndex?: string;
  onClose: () => void;
};

export const MatrixLoginModal = ({ isOpen = true, zIndex, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);

  useEffect(() => {
    if (isOpen && !isModalOpen) {
      toggleIsModalOpen();
    }

    if (!isOpen && isModalOpen) {
      closeMatrixModal({ skipEvent: true });
    }
  }, [isOpen]);

  const closeMatrixModal = (options?: { skipEvent: boolean }) => {
    toggleIsModalOpen();

    if (!options?.skipEvent) {
      setTimeout(onClose, DEFAULT_TRANSITION);
    }
  };

  return (
    <BaseModal
      closeButton
      isOpen={isModalOpen}
      title={t('settings.matrix.logInTitle')}
      zIndex={zIndex}
      onClose={closeMatrixModal}
    >
      <MatrixInfoPopover />
      <LoginForm />
    </BaseModal>
  );
};
