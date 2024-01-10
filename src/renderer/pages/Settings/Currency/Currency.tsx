import { useNavigate } from 'react-router-dom';

import { CurrencyModal } from '@widgets/CurrencyModal';
import { Paths } from '@shared/routes';

export const Currency = () => {
  const navigate = useNavigate();

  return <CurrencyModal onClose={() => navigate(Paths.SETTINGS)} />;
};
