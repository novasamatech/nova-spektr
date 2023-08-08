import { useNavigate } from 'react-router-dom';

import { Paths } from '@renderer/app/providers';
import { EditContactModal } from '@renderer/widgets';
import { EditRouteGuard } from '@renderer/features/contacts';

export const EditContact = () => {
  const navigate = useNavigate();

  return (
    <EditRouteGuard redirectPath={Paths.ADDRESS_BOOK}>
      {(contact) => <EditContactModal contact={contact} onClose={() => navigate(Paths.ADDRESS_BOOK)} />}
    </EditRouteGuard>
  );
};
