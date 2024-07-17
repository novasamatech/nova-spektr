import { useNavigate } from 'react-router-dom';

import { Paths } from '@shared/routes';

import { EditRouteGuard } from '@features/contacts';

import { EditContactModal } from '@widgets/ManageContactModal';

export const EditContact = () => {
  const navigate = useNavigate();

  return (
    <EditRouteGuard redirectPath={Paths.ADDRESS_BOOK}>
      {(contact) => <EditContactModal contact={contact} onClose={() => navigate(Paths.ADDRESS_BOOK)} />}
    </EditRouteGuard>
  );
};
