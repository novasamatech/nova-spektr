import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

export const EmptyFilteredContacts = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Graphics name="emptyList" alt={t('addressBook.contactList.emptySearchLabel')} size={178} />
      <BodyText className="text-text-tertiary">{t('addressBook.contactList.emptySearchLabel')}</BodyText>
    </div>
  );
};
