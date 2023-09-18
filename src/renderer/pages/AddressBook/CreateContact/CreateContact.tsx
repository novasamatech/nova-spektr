import { useNavigate } from 'react-router-dom';

import { Paths } from '@renderer/app/providers';
import { CreateContactModal } from '@renderer/widgets';

export const CreateContact = () => {
  const navigate = useNavigate();

  return <CreateContactModal onClose={() => navigate(Paths.ADDRESS_BOOK)} />;
};
