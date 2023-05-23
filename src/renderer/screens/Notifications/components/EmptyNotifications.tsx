import { Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';

const EmptyNotifications = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center mt-10 mb-5">
      <Icon as="img" name="noResults" size={380} />
      <p className="text-neutral text-2xl font-bold mb-10">{t('notifications.noNotificationsDescription')}</p>
    </div>
  );
};

export default EmptyNotifications;
