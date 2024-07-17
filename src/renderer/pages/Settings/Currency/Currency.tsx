import { useNavigate } from 'react-router-dom';

import { Paths } from '@shared/routes';

import { CurrencyModal } from '@widgets/CurrencyModal';

export const Currency = () => {
  const navigate = useNavigate();

  return <CurrencyModal onClose={() => navigate(Paths.SETTINGS)} />;
};
