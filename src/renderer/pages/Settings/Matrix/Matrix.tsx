import { useNavigate } from 'react-router-dom';

import { MatrixLoginModal, MatrixInfoModal } from '@renderer/widgets/MatrixModal';
import { MatrixRouteGuard } from '@renderer/features/matrix';
import { Paths } from '@renderer/app/providers';

export const Matrix = () => {
  const navigate = useNavigate();

  const closeModal = () => {
    navigate(Paths.SETTINGS);
  };

  return (
    <MatrixRouteGuard>
      {(isLoggedIn) =>
        isLoggedIn ? <MatrixInfoModal onClose={closeModal} /> : <MatrixLoginModal onClose={closeModal} />
      }
    </MatrixRouteGuard>
  );
};
