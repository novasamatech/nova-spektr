import { useI18n } from '@/shared/i18n';
import { BodyText, Icon } from '@/shared/ui';

export const EmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-4">
      <Icon as="img" name="emptyList" alt={t('addressBook.contactList.noContactsLabel')} size={178} />
      <BodyText className="w-[300px] text-center text-text-tertiary">{t('onboarding.watchOnly.emptyState')}</BodyText>
    </div>
  );
};
