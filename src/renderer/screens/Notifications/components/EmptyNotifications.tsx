import { Icon } from '@renderer/components/ui';
import { BodyText } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';

const EmptyNotifications = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full items-center justify-center">
      <Icon as="img" name="emptyList" size={178} />
      <BodyText className="text-text-tertiary">{t('notifications.noNotificationsDescription')}</BodyText>
    </div>
  );
};

export default EmptyNotifications;
