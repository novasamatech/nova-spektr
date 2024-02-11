import { useNavigate } from 'react-router-dom';

import { Paths } from '@shared/routes';
import { MatrixLoginModal, MatrixVerificationModal } from '@widgets/MatrixModal';
import { MatrixAutoLogin } from '@features/matrix/MatrixAutoLogin';

export const Matrix = () => {
  const navigate = useNavigate();

  const closeModal = () => {
    navigate(Paths.SETTINGS);
  };

  return (
    <>
      <MatrixAutoLogin />
      <MatrixLoginModal onClose={closeModal} />
      <MatrixVerificationModal onClose={closeModal} />
    </>
  );
};
