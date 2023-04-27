import { format } from 'date-fns';
import { TFunction } from 'react-i18next';

import { BodyText, FootnoteText } from '@renderer/components/ui-redesign';
import {
  MultisigAccountInvitedNotification,
  MultisigNotification,
  MultisigNotificationType,
  Notification,
} from '@renderer/domain/notification';
import { useI18n } from '@renderer/context/I18nContext';
import { ChainAddress } from '@renderer/components/ui';

const NotificationBody = {
  [MultisigNotificationType.ACCOUNT_INVITED]: (n: Notification, t: TFunction) => {
    const typedNotification = n as Notification & MultisigNotification & MultisigAccountInvitedNotification;

    return (
      <BodyText className="flex gap-1.5">
        {t('notifications.details.newMultisigAccountTitle')}
        <ChainAddress
          className="w-fit"
          address={typedNotification.multisigAccountId}
          name={typedNotification.multisigAccountName}
        />
        {t('notifications.details.newMultisigAccountDescription', {
          threshold: typedNotification.threshold,
          signatories: typedNotification.signatories.length,
        })}
      </BodyText>
    );
  },
  [MultisigNotificationType.MST_CREATED]: () => <div className="flex"></div>,
  [MultisigNotificationType.MST_APPROVED]: () => <div className="flex"></div>,
  [MultisigNotificationType.MST_EXECUTED]: () => <div className="flex"></div>,
  [MultisigNotificationType.MST_CANCELLED]: () => <div className="flex"></div>,
} as const;

type Props = {
  notification: Notification;
};

const NotificationRow = ({ notification }: Props) => {
  const { t, dateLocale } = useI18n();

  const { dateCreated, type } = notification;

  return (
    <li className="flex flex-col bg-block-background-default rounded">
      <div className="h-[48px] pl-5 pr-5 flex items-center justify-items-start">
        <FootnoteText className="text-text-tertiary pr-1.5">
          {format(new Date(dateCreated || 0), 'p', { locale: dateLocale })}
        </FootnoteText>
        {NotificationBody[type](notification, t)}
      </div>
    </li>
  );
};

export default NotificationRow;
