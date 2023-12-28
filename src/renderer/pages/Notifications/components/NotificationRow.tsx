import { format } from 'date-fns';

import { FootnoteText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { NotificationProvider } from '@features/notifications';
import { Notification } from '@entities/notification';

type Props = {
  notification: Notification;
};

export const NotificationRow = ({ notification }: Props) => {
  const { dateLocale } = useI18n();

  const { dateCreated } = notification;

  return (
    <li className="bg-block-background-default rounded p-4 flex justify-between">
      <NotificationProvider notification={notification} />
      <FootnoteText className="text-text-tertiary">
        {format(new Date(dateCreated || 0), 'p', { locale: dateLocale })}
      </FootnoteText>
    </li>
  );
};
