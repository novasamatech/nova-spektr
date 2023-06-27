import { Icon } from '@renderer/components/ui';
import { BodyText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';

export const EmptySearch = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      <Icon as="img" name="emptyList" alt={t('addressBook.contactList.emptySearchLabel')} size={178} />
      <BodyText className="text-text-tertiary">{t('addressBook.contactList.emptySearchLabel')}</BodyText>
    </div>
  );
};
