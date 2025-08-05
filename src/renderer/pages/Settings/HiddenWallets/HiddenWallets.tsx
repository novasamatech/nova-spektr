import { useNavigate } from 'react-router-dom';

import { Paths } from '@/shared/routes';
import { HiddenWalletsModal } from '@/widgets/HiddenWallets';

export const HiddenWallets = () => {
  const navigate = useNavigate();

  return <HiddenWalletsModal onClose={() => navigate(Paths.SETTINGS)} />;
};
