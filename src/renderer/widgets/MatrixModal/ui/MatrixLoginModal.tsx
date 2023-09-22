import { useEffect } from 'react';

import { useI18n } from '@renderer/app/providers';
import { BaseModal } from '@renderer/shared/ui';
import { MatrixInfoPopover } from './MatrixInfoPopover';
import { LoginForm } from './LoginForm';
import { useToggle } from '@renderer/shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';

type Props = {
  isOpen?: boolean;
  onClose: () => void;
};

export const MatrixLoginModal = ({ isOpen = true, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);

  useEffect(() => {
    if (isOpen && !isModalOpen) {
      toggleIsModalOpen();
    }

    if (!isOpen && isModalOpen) {
      closeMatrixModal();
    }
  }, [isOpen]);

  const closeMatrixModal = () => {
    toggleIsModalOpen();
    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  return (
    <BaseModal closeButton isOpen={isModalOpen} title={t('settings.matrix.logInTitle')} onClose={closeMatrixModal}>
      <MatrixInfoPopover />
      <LoginForm />
    </BaseModal>
  );
};
