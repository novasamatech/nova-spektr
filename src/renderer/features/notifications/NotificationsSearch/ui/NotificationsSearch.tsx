import { useI18n } from '@/shared/i18n';
import { Box, SearchInput  } from '@/shared/ui-kit';
import { notificationListModel } from '../../NotificationsList/model/notification-list-model';
import { NotificationsSettings } from '../../NotificationsSettings';

export const NotificationsSearch = () => {
  const { t } = useI18n();

  return (
    <Box direction="row" gap={2}>
      <div className="w-[230px]">
        <SearchInput
          placeholder={t('notifications.searchPlaceholder')}
          onChange={notificationListModel.events.queryChanged}
        />
      </div>
      <NotificationsSettings />
    </Box>
  );
};
