import { useUnit } from 'effector-react';

import { FootnoteText } from '@shared/ui';
import { NotificationRow } from './NotificationRow';
import { notificationListModel } from '../model/notification-list-model';

export const NotificationsList = () => {
  const notificationGroups = useUnit(notificationListModel.$notificationGroups);

  if (notificationGroups.length === 0) return null;

  return (
    <div className="overflow-y-auto flex-1 mx-auto w-[736px] mt-4 flex flex-col gap-4">
      {notificationGroups.map(([date, notifications]) => (
        <section className="w-full flex flex-col gap-1" key={date}>
          <FootnoteText className="text-text-tertiary ml-2 h-8 flex items-center">{date}</FootnoteText>
          <ul className="flex flex-col gap-y-1.5">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <NotificationRow notification={notification} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
