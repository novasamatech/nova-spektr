import { useNavigate } from 'react-router-dom';

import { Paths } from '@shared/routes';

import { MatrixAutoLogin, MatrixLogin, MatrixVerification } from '@features/matrix';

export const Matrix = () => {
  const navigate = useNavigate();

  const closeModal = () => {
    navigate(Paths.SETTINGS);
  };

  return (
    <>
      <MatrixAutoLogin />
      <MatrixLogin redirectStep="settings_matrix" onClose={closeModal} />
      <MatrixVerification onClose={closeModal} />
    </>
  );
};
