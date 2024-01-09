import { Header } from '@shared/ui';
import { useI18n } from '@app/providers';
import { NotificationsList, EmptyNotifications } from '@features/notifications';

export const Notifications = () => {
  const { t } = useI18n();

  return (
    <div className="h-full flex flex-col">
      <Header title={t('notifications.title')} />

      <NotificationsList />
      <EmptyNotifications />
    </div>
  );
};
