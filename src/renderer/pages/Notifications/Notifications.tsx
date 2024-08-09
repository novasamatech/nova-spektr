import { useI18n } from '@app/providers';
import { Header } from '@shared/ui';
import { EmptyNotifications, NotificationsList } from '@features/notifications';

export const Notifications = () => {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col">
      <Header title={t('notifications.title')} />

      <NotificationsList />
      <EmptyNotifications />
    </div>
  );
};
