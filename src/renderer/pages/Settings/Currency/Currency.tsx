import { useNavigate } from 'react-router-dom';

import { SelectCurrencyModal } from '@renderer/widgets';
import { Paths } from '@renderer/app/providers';

export const Currency = () => {
  const navigate = useNavigate();

  return <SelectCurrencyModal onClose={() => navigate(Paths.SETTINGS)} />;
};
