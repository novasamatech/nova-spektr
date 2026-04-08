import { useNavigate } from 'react-router-dom';

import { Slot } from '@/shared/di';
import { Paths } from '@/shared/routes';

import { currencyModalSlot } from './slots';

export const Currency = () => {
  const navigate = useNavigate();

  return <Slot id={currencyModalSlot} props={{ onClose: () => navigate(Paths.SETTINGS) }} />;
};
