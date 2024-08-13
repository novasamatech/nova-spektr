import { useI18n } from '@app/providers';
import { BodyText, Icon } from '@shared/ui';

export const EmptyFilteredContacts = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Icon as="img" name="emptyList" alt={t('addressBook.contactList.emptySearchLabel')} size={178} />
      <BodyText className="text-text-tertiary">{t('addressBook.contactList.emptySearchLabel')}</BodyText>
    </div>
  );
};
