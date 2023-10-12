import { useNavigate } from 'react-router-dom';

import { useI18n } from '@renderer/app/providers';
import { Paths } from '@renderer/shared/routes';
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
