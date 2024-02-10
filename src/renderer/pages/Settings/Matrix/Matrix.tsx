import { useNavigate } from 'react-router-dom';
import { useUnit } from 'effector-react';

import { MatrixLoginModal, MatrixInfoModal } from '@widgets/MatrixModal';
import { Paths } from '@shared/routes';
import { matrixModel, matrixUtils } from '@entities/matrix';

export const Matrix = () => {
  const navigate = useNavigate();

  const loginStatus = useUnit(matrixModel.$loginStatus);

  const closeModal = () => {
    navigate(Paths.SETTINGS);
  };

  return matrixUtils.isLoggedIn(loginStatus) ? (
    <MatrixInfoModal onClose={closeModal} />
  ) : (
    <MatrixLoginModal onClose={closeModal} />
  );
};
