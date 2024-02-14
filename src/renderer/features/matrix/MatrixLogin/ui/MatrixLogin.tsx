import { useEffect } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { BaseModal } from '@shared/ui';
import { MatrixInfoPopover, matrixUtils, matrixModel } from '@entities/matrix';
import { LoginForm } from './LoginForm';
import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';

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

  const getRedirectUrl = (redirectStep: string): string => {
    if (window.App) {
      return `${window.location.protocol}${window.location.pathname}/?step=${redirectStep}`;
    }

    return `${window.location.origin}/?step=${redirectStep}`;

    // > https://localhost:3000/?step=settings&loginToken=syl_YWpqbXKPMxHLhGIUDdxa_4didlG
    // > nova://webapp/?step=settings&loginToken=syl_YWpqbXKPMxHLhGIUDdxa_4didlG
    // return 'novaspektr-stage://webapp?step=settings';
  };

  if (!matrixUtils.isLoggedOut(loginStatus)) return null;

  return (
    <BaseModal
      closeButton
      isOpen={isModalOpen}
      title={t('settings.matrix.logInTitle')}
      zIndex={zIndex}
      onClose={closeMatrixModal}
    >
      <MatrixInfoPopover />
      <LoginForm redirectUrl={getRedirectUrl(redirectStep)} />
    </BaseModal>
  );
};
