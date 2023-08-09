import { useNavigate } from 'react-router-dom';

import { Paths, useI18n } from '@renderer/app/providers';
import { Button } from '@renderer/shared/ui';

export const CreateContactNavigation = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <Button size="sm" onClick={() => navigate(Paths.CREATE_CONTACT)}>
      {t('addressBook.createContact.addContactButton')}
    </Button>
  );
};
