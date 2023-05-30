import { Icon } from '@renderer/components/ui';
import { BodyText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';

const EmptyFilter = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      <Icon as="img" name="noContacts" size={178} />
      <BodyText className="text-text-tertiary">{t('addressBook.contactList.emptySearchLabel')}</BodyText>
    </div>
  );
};

export default EmptyFilter;
