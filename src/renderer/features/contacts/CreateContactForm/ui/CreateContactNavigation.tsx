import { useNavigate } from 'react-router-dom';

import { useI18n } from '@app/providers';
import { Paths } from '@shared/routes';
import { Button } from '@shared/ui';

export const CreateContactNavigation = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <Button size="sm" onClick={() => navigate(Paths.CREATE_CONTACT)}>
      {t('addressBook.createContact.addContactButton')}
    </Button>
  );
};
