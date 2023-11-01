import { useNavigate } from 'react-router-dom';

import { CurrencyModal } from '@renderer/widgets';
import { Paths } from '@renderer/shared/routes';

export const Currency = () => {
  const navigate = useNavigate();

  return <CurrencyModal onClose={() => navigate(Paths.SETTINGS)} />;
};
