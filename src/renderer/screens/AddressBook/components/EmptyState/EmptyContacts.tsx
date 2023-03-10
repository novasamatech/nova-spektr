import { Button, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

type Props = {
  onAddContact?: () => void;
};

const EmptyContacts = ({ onAddContact }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center mt-10 mb-5">
      <Icon as="img" name="noContacts" size={380} />
      <p className="text-neutral text-2xl font-bold mb-10">{t('addressBook.contactList.noContactsLabel')}</p>

      {onAddContact && (
        <Button className="mb-10" weight="lg" variant="fill" pallet="primary" onClick={onAddContact}>
          {t('addressBook.contactList.noContactsButton')}
        </Button>
      )}
    </div>
  );
};

export default EmptyContacts;
