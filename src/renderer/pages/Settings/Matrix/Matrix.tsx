import { useNavigate } from 'react-router-dom';

import { MatrixLoginModal, MatrixInfoModal } from '@renderer/widgets/MatrixModal';
import { useMatrix } from '@renderer/app/providers';
import { Paths } from '@renderer/shared/routes';

export const Matrix = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useMatrix();

  const closeModal = () => {
    navigate(Paths.SETTINGS);
  };

  return isLoggedIn ? <MatrixInfoModal onClose={closeModal} /> : <MatrixLoginModal onClose={closeModal} />;
};
