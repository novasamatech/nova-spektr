import { format } from 'date-fns';
import { TFunction, Trans } from 'react-i18next';

import { BodyText, FootnoteText, Identicon } from '@renderer/shared/ui';
import {
  MultisigAccountInvitedNotification,
  MultisigNotification,
  MultisigNotificationType,
  Notification,
} from '../../model/notification';
import { useI18n } from '@renderer/app/providers';
import { toAddress } from '@renderer/shared/lib/utils';

const NotificationBody = {
  [MultisigNotificationType.ACCOUNT_INVITED]: (n: Notification, t: TFunction) => {
    const typedNotification = n as Notification & MultisigNotification & MultisigAccountInvitedNotification;

    return (
      <BodyText className="inline">
        <Trans
          t={t}
          i18nKey="notifications.details.newMultisigAccountDescription"
          values={{
            threshold: typedNotification.threshold,
            signatories: typedNotification.signatories.length,
            name: typedNotification.multisigAccountName,
          }}
          components={{
            identicon: (
              <Identicon
                className="inline-block"
                buttonClassName="inline align-bottom"
                address={toAddress(typedNotification.multisigAccountId)}
                size={20}
                background={false}
                canCopy={true}
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

export const NotificationRow = ({ notification }: Props) => {
  const { t, dateLocale } = useI18n();

  const { dateCreated, type } = notification;

  return (
    <li className="flex flex-col bg-block-background-default rounded">
      <div className="py-4 pl-6 pr-6 flex">
        <FootnoteText className="text-text-tertiary pr-5.5 leading-5">
          {format(new Date(dateCreated || 0), 'p', { locale: dateLocale })}
        </FootnoteText>
        {NotificationBody[type](notification, t)}
      </div>
    </li>
  );
};
