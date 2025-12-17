import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { BodyText, FootnoteText, SmallTitleText } from '@/shared/ui';
import { AsyncItem, Graphics } from '@/shared/ui-kit';
import { notificationListModel } from '../model/notification-list-model';

import { NotificationRow } from './NotificationRow';

export const NotificationsList = () => {
  const { t } = useI18n();
  const notificationGroups = useUnit(notificationListModel.$notificationGroups);
  const isSearchEmpty = useUnit(notificationListModel.$isSearchEmpty);

  if (isSearchEmpty) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-y-4">
        <Graphics name="emptyList" size={178} />
        <div className="flex flex-col items-center gap-y-2">
          <SmallTitleText>{t('notifications.emptySearchTitle')}</SmallTitleText>
          <BodyText className="text-text-tertiary">{t('notifications.emptySearchDescription')}</BodyText>
        </div>
      </div>
    );
  }

  if (notificationGroups.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex h-full w-full flex-1 flex-col items-center overflow-y-auto pl-6">
      {notificationGroups.map(([date, notifications]) => (
        <section className="flex w-[736px] flex-col gap-1" key={date}>
          <FootnoteText className="ml-2 flex h-8 items-center text-text-tertiary">{date}</FootnoteText>
          <ul className="flex flex-col gap-y-1.5">
            {notifications.map((notification) => (
              <AsyncItem key={notification.id}>
                <NotificationRow notification={notification} />
              </AsyncItem>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
