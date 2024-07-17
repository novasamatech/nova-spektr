import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@app/providers';

import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';
import { BaseModal } from '@shared/ui';

import { MatrixInfoPopover, matrixModel, matrixUtils } from '@entities/matrix';

import { LoginForm } from './LoginForm';

type Props = {
  isOpen?: boolean;
  zIndex?: string;
  redirectStep: string;
  onClose: () => void;
};

export const MatrixLogin = ({ isOpen = true, zIndex, redirectStep, onClose }: Props) => {
  const { t } = useI18n();

  const loginStatus = useUnit(matrixModel.$loginStatus);

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

  if (!matrixUtils.isLoggedOut(loginStatus)) {
    return null;
  }

  return (
    <BaseModal
      closeButton
      isOpen={isModalOpen}
      title={t('settings.matrix.logInTitle')}
      zIndex={zIndex}
      onClose={closeMatrixModal}
    >
      <MatrixInfoPopover />
      <LoginForm redirectStep={redirectStep} />
    </BaseModal>
  );
};
