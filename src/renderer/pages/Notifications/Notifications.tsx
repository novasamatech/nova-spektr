import { groupBy } from 'lodash';
import { format } from 'date-fns';

import { useI18n } from '@app/providers';
import EmptyNotifications from './components/EmptyNotifications';
import { sortByDate } from './common/utils';
import { FootnoteText } from '@shared/ui';
import { useNotification, NotificationRow } from '@entities/notification';
import { Header } from '@renderer/components/common';

export const Notifications = () => {
  const { t, dateLocale } = useI18n();

  const { getLiveNotifications } = useNotification();
  const notifications = getLiveNotifications();

  const groupedNotifications = groupBy(notifications, ({ dateCreated }) =>
    format(new Date(dateCreated || 0), 'PP', { locale: dateLocale }),
  );

  return (
    <div className="h-full flex flex-col">
      <Header title={t('notifications.title')} />

      <div className="overflow-y-auto flex-1 mx-auto w-[736px] mt-4 flex flex-col gap-4">
        {notifications.length ? (
          Object.entries(groupedNotifications)
            .sort(sortByDate)
            .map(([date, notifies]) => (
              <section className="w-full flex flex-col gap-1" key={date}>
                <FootnoteText className="text-text-tertiary ml-2 h-8 flex items-center">{date}</FootnoteText>
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
