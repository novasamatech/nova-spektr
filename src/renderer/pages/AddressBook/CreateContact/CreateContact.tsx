import { useNavigate } from 'react-router-dom';

import { Paths } from '@shared/routes';

import { CreateContactModal } from '@widgets/ManageContactModal';

export const CreateContact = () => {
  const navigate = useNavigate();

  return <CreateContactModal onClose={() => navigate(Paths.ADDRESS_BOOK)} />;
};
