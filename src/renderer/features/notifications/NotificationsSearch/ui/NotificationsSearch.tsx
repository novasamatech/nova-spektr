import { useI18n } from '@/shared/i18n';
import { SearchInput } from '@/shared/ui-kit';
import { notificationListModel } from '../../NotificationsList/model/notification-list-model';

export const NotificationsSearch = () => {
  const { t } = useI18n();

  return (
    <div className="w-[230px]">
      <SearchInput
        placeholder={t('notifications.searchPlaceholder')}
        onChange={notificationListModel.events.queryChanged}
      />
    </div>
  );
};
