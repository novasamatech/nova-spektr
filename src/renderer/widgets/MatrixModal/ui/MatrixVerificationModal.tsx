import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { BaseModal } from '@shared/ui';
import { MatrixInfoPopover, matrixModel, matrixUtils } from '@entities/matrix';
import { UserInfo } from './UserInfo';
import { Verification } from './Verification';
import { useToggle } from '@shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@shared/lib/utils';

type Props = {
  onClose: () => void;
};

export const MatrixVerificationModal = ({ onClose }: Props) => {
  const { t } = useI18n();

  const loginStatus = useUnit(matrixModel.$loginStatus);

  const [isModalOpen, toggleIsModalOpen] = useToggle(true);

  const closeMatrixModal = () => {
    toggleIsModalOpen();
    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  if (!matrixUtils.isLoggedIn(loginStatus)) return null;

  return (
    <BaseModal closeButton isOpen={isModalOpen} title={t('settings.matrix.generalTitle')} onClose={closeMatrixModal}>
      <MatrixInfoPopover />
      <div className="flex flex-col gap-y-4">
        <UserInfo />
        <Verification />
      </div>
    </BaseModal>
  );
};
