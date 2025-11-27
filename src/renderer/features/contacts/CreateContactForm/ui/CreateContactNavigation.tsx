import { useNavigate } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { Button, Icon } from '@/shared/ui';

export const CreateContactNavigation = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <Button
      size="sm"
      prefixElement={<Icon name="add" size={16} className="text-inherit" />}
      onClick={() => navigate(Paths.CREATE_CONTACT)}
    >
      {t('addressBook.createContact.addContactButton')}
    </Button>
  );
};
