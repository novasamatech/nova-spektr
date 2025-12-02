import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { Header } from '@/shared/ui';
import { notificationModel } from '@/entities/notification';
import { EmptyNotifications, NotificationsList, NotificationsSearch } from '@/features/notifications';

export const Notifications = () => {
  const { t } = useI18n();

  useEffect(() => {
    notificationModel.events.notificationsViewed();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Header title={t('notifications.title')} titleClass="py-[3px]" headerClass="pt-4 pb-[15px]">
        <NotificationsSearch />
      </Header>

      <NotificationsList />
      <EmptyNotifications />
    </div>
  );
};
