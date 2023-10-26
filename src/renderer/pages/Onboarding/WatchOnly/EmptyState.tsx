import { Icon, BodyText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';

const EmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-y-4 h-full">
      <Icon as="img" name="emptyList" alt={t('addressBook.contactList.noContactsLabel')} size={178} />
      <BodyText className="text-text-tertiary w-[300px] text-center">{t('onboarding.watchOnly.emptyState')}</BodyText>
    </div>
  );
};

export default EmptyState;
