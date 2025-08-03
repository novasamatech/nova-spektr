import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { Graphics } from '@/shared/ui-kit';

export const EmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-4">
      <Graphics name="emptyList" alt={t('addressBook.contactList.noContactsLabel')} size={178} />
      <BodyText className="text-text-tertiary w-[300px] text-center">{t('onboarding.watchOnly.emptyState')}</BodyText>
    </div>
  );
};
