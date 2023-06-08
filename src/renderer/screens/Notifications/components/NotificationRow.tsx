import { format } from 'date-fns';
import { TFunction, Trans } from 'react-i18next';

import { BodyText, FootnoteText } from '@renderer/components/ui-redesign';
import {
  MultisigAccountInvitedNotification,
  MultisigNotification,
  MultisigNotificationType,
  Notification,
} from '@renderer/domain/notification';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountAddress } from '@renderer/components/common';

const NotificationBody = {
  [MultisigNotificationType.ACCOUNT_INVITED]: (n: Notification, t: TFunction) => {
    const typedNotification = n as Notification & MultisigNotification & MultisigAccountInvitedNotification;

    return (
      <BodyText className="flex gap-1.5">
        {t('notifications.details.newMultisigAccountTitle')}
        <Trans
          t={t}
          i18nKey="notifications.details.newMultisigAccountDescription"
          values={{
            threshold: typedNotification.threshold,
            signatories: typedNotification.signatories.length,
          }}
          components={{
            account: (
              <AccountAddress
                size={20}
                addressFont="text-body"
                address={typedNotification.multisigAccountId}
                name={typedNotification.multisigAccountName}
              />
            ),
          }}
        />
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
      <div className="h-[52px] pl-6 pr-6 flex items-center justify-items-start">
        <FootnoteText className="text-text-tertiary pr-5.5">
          {format(new Date(dateCreated || 0), 'p', { locale: dateLocale })}
        </FootnoteText>
        {NotificationBody[type](notification, t)}
      </div>
    </li>
  );
};

export default NotificationRow;
