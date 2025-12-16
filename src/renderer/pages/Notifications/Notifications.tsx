import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Header, IconButton } from '@/shared/ui';
import { SearchInput } from '@/shared/ui-kit';
import { notificationModel } from '@/entities/notification';
import {
  EmptyNotifications,
  NotificationsList,
  NotificationsSettingsModal,
  notificationListModel,
} from '@/features/notifications';

export const Notifications = () => {
  const { t } = useI18n();
  const query = useUnit(notificationListModel.$query);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    notificationModel.events.notificationsViewed();
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Header title={t('notifications.title')}>
        <div className="flex items-center gap-x-2">
          <div className="w-[230px]">
            <SearchInput
              value={query}
              placeholder={t('notifications.searchPlaceholder')}
              onChange={notificationListModel.events.queryChanged}
            />
          </div>
          <IconButton name="settingsLite" className="p-1.5" onClick={() => setIsSettingsOpen(true)} />
        </div>
      </Header>

      <NotificationsList />
      <EmptyNotifications />

      <NotificationsSettingsModal isOpen={isSettingsOpen} showTrigger={false} onToggle={setIsSettingsOpen} />
    </div>
  );
};
