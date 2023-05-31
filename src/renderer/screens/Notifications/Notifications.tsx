import { groupBy } from 'lodash';
import { format } from 'date-fns';

import { useI18n } from '@renderer/context/I18nContext';
import EmptyNotifications from './components/EmptyNotifications';
import NotificationRow from './components/NotificationRow';
import { sortByDate } from './common/utils';
import { FootnoteText } from '@renderer/components/ui-redesign';
import { useNotification } from '@renderer/services/notification/notificationService';
import { Header } from '@renderer/components/common';

const Notifications = () => {
  const { t, dateLocale } = useI18n();

  const { getLiveNotifications } = useNotification();
  const notifications = getLiveNotifications();

  const groupedNotifications = groupBy(notifications, ({ dateCreated }) =>
    format(new Date(dateCreated || 0), 'PP', { locale: dateLocale }),
  );

  return (
    <div className="h-full flex flex-col items-start relative bg-main-app-background">
      <Header title={t('notifications.title')} />

      <div className="overflow-y-auto flex-1 mx-auto w-full pl-6 pt-4">
        {notifications.length ? (
          Object.entries(groupedNotifications)
            .sort(sortByDate)
            .map(([date, notifies]) => (
              <section className="w-fit mt-6" key={date}>
                <FootnoteText className="text-text-tertiary mb-3 ml-2">{date}</FootnoteText>
                <ul className="flex flex-col gap-y-1.5">
                  {notifies
                    .sort((a, b) => (b.dateCreated || 0) - (a.dateCreated || 0))
                    .map((notification) => (
                      <NotificationRow key={notification.id} notification={notification} />
                    ))}
                </ul>
              </section>
            ))
        ) : (
          <EmptyNotifications />
        )}
      </div>
    </div>
  );
};

export default Notifications;
