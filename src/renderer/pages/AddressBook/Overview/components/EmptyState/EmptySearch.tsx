import { Icon, BodyText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';

export const EmptySearch = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      <Icon as="img" name="emptyList" alt={t('addressBook.contactList.emptySearchLabel')} size={178} />
      <BodyText className="text-text-tertiary">{t('addressBook.contactList.emptySearchLabel')}</BodyText>
    </div>
  );
};
