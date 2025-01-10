import { useNavigate } from 'react-router-dom';

import { useI18n } from '@/shared/i18n';
import { Paths } from '@/shared/routes';
import { BodyText, Button, Icon } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

type Props = {
  description?: string;
  onNewContact?: () => void;
};
export const EmptyContactList = ({ description, onNewContact }: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const navigateToNewContact = () => {
    if (onNewContact) {
      onNewContact();
    } else {
      navigate(Paths.CREATE_CONTACT);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-4">
      <Graphics name="emptyList" alt={t('addressBook.contactList.noContactsLabel')} size={178} />
      <BodyText className="text-text-tertiary">{description || t('addressBook.contactList.noContactsLabel')}</BodyText>

      <Button
        variant="text"
        className="h-4.5"
        suffixElement={<Icon size={16} name="add" />}
        onClick={navigateToNewContact}
      >
        {t('addressBook.createContact.addContactButton')}
      </Button>
    </div>
  );
};
