import { useNavigate } from 'react-router-dom';

import { MatrixLoginModal, MatrixInfoModal } from '@widgets/MatrixModal';
import { useMatrix } from '@app/providers';
import { Paths } from '@shared/routes';

export const Matrix = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useMatrix();

  const closeModal = () => {
    navigate(Paths.SETTINGS);
  };

  return isLoggedIn ? <MatrixInfoModal onClose={closeModal} /> : <MatrixLoginModal onClose={closeModal} />;
};
