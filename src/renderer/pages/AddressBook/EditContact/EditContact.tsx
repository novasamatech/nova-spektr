import { useNavigate } from 'react-router-dom';

import { Paths } from '@shared/routes';
import { EditContactModal } from '@widgets/ManageContactModal';
import { EditRouteGuard } from '@features/contacts';

export const EditContact = () => {
  const navigate = useNavigate();

  return (
    <EditRouteGuard redirectPath={Paths.ADDRESS_BOOK}>
      {(contact) => <EditContactModal contact={contact} onClose={() => navigate(Paths.ADDRESS_BOOK)} />}
    </EditRouteGuard>
  );
};
