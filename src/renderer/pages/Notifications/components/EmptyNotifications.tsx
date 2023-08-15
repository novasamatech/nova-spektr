import { BodyText } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import EmptyList from '@images/misc/empty-list.webp';

const EmptyNotifications = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full items-center justify-center">
      <img src={EmptyList} alt="" width={178} height={178} />
      <BodyText className="text-text-tertiary">{t('notifications.noNotificationsDescription')}</BodyText>
    </div>
  );
};

export default EmptyNotifications;
