import { Icon, BodyText, Button } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';

type Props = {
  description?: string;
  onAddContact?: () => void;
};

export const EmptyContacts = ({ description, onAddContact }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-y-4 h-full">
      <Icon as="img" name="emptyList" alt={t('addressBook.contactList.noContactsLabel')} size={178} />
      <BodyText className="text-text-tertiary">{description || t('addressBook.contactList.noContactsLabel')}</BodyText>

      {onAddContact && (
        <Button variant="text" className="h-4.5" suffixElement={<Icon size={16} name="add" />} onClick={onAddContact}>
          {t('addressBook.addContactButton')}
        </Button>
      )}
    </div>
  );
};
