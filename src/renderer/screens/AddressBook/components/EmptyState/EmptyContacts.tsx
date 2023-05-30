import { Icon } from '@renderer/components/ui';
import { BodyText, Button } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  onAddContact?: () => void;
};

const EmptyContacts = ({ onAddContact }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      <Icon as="img" name="noContacts" size={178} />
      <BodyText className="text-text-tertiary">{t('addressBook.contactList.noContactsLabel')}</BodyText>

      {onAddContact && (
        <Button
          variant="text"
          pallet="primary"
          className="font-semibold h-4.5"
          suffixElement={<Icon size={16} name="add" />}
          onClick={onAddContact}
        >
          {t('addressBook.addContactButton')}
        </Button>
      )}
    </div>
  );
};

export default EmptyContacts;
