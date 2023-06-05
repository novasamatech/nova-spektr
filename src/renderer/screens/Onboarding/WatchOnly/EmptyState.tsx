import { Icon } from '@renderer/components/ui';
import { BodyText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';

const EmptyState = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full">
      <Icon as="img" name="emptyList" alt={t('addressBook.contactList.noContactsLabel')} size={178} />
      <BodyText className="text-text-tertiary w-[300px] text-center">{t('onboarding.watchOnly.emptyState')}</BodyText>
    </div>
  );
};

export default EmptyState;
