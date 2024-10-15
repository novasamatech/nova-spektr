import { useUnit } from 'effector-react';

import { FootnoteText } from '@/shared/ui';
import { notificationListModel } from '../model/notification-list-model';

import { NotificationRow } from './NotificationRow';

export const NotificationsList = () => {
  const notificationGroups = useUnit(notificationListModel.$notificationGroups);

  if (notificationGroups.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto mt-4 flex w-[736px] flex-1 flex-col gap-4 overflow-y-auto">
      {notificationGroups.map(([date, notifications]) => (
        <section className="flex w-full flex-col gap-1" key={date}>
          <FootnoteText className="ml-2 flex h-8 items-center text-text-tertiary">{date}</FootnoteText>
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
