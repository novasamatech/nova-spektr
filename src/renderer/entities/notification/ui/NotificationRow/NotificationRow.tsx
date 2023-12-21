import { format } from 'date-fns';

import { FootnoteText } from '@shared/ui';
import { Notification } from '../../model/notification';
import { useI18n } from '@app/providers';
import { NotificationBody } from './NotificationBody';

type Props = {
  notification: Notification;
};

export const NotificationRow = ({ notification }: Props) => {
  const { dateLocale } = useI18n();

  const { dateCreated } = notification;

  return (
    <li className="flex flex-col bg-block-background-default rounded">
      <div className="p-4 flex justify-between">
        <NotificationBody notification={notification} />
        <FootnoteText className="text-text-tertiary">
          {format(new Date(dateCreated || 0), 'p', { locale: dateLocale })}
        </FootnoteText>
      </div>
    </li>
  );
};
