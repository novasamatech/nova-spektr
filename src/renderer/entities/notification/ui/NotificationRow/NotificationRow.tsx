import { format } from 'date-fns';
import { TFunction, Trans } from 'react-i18next';
import { useUnit } from 'effector-react';

import { BodyText, FootnoteText, Identicon } from '@shared/ui';
import {
  MultisigAccountInvitedNotification,
  MultisigNotification,
  MultisigNotificationType,
  Notification,
} from '../../model/notification';
import { useI18n } from '@app/providers';
import { WalletIcon, walletModel } from '@entities/wallet';
import { Wallet } from '@shared/core';
import { toAddress } from '@shared/lib/utils';

const NotificationBody = {
  [MultisigNotificationType.ACCOUNT_INVITED]: (n: Notification, t: TFunction, wallet?: Wallet) => {
    const typedNotification = n as Notification & MultisigNotification & MultisigAccountInvitedNotification;

    const identicon = wallet ? (
      <WalletIcon type={wallet.type} size={20} className="inline mx-2" />
    ) : (
      <Identicon
        className="inline-block mx-2"
        buttonClassName="inline align-bottom"
        address={toAddress(typedNotification.multisigAccountId)}
        size={20}
        background={false}
        canCopy={true}
      />
    );

    return (
      <BodyText className="inline-flex">
        <Trans
          t={t}
          i18nKey="notifications.details.newMultisigAccountDescription"
          values={{
            threshold: typedNotification.threshold,
            signatories: typedNotification.signatories.length,
            name: wallet?.name || typedNotification.multisigAccountName,
          }}
          components={{
            identicon,
          }}
        />
      </BodyText>
    );
  },
  [MultisigNotificationType.MST_CREATED]: () => <></>,
  [MultisigNotificationType.MST_APPROVED]: () => <></>,
  [MultisigNotificationType.MST_EXECUTED]: () => <></>,
  [MultisigNotificationType.MST_CANCELLED]: () => <></>,
} as const;

type Props = {
  notification: Notification;
};

export const NotificationRow = ({ notification }: Props) => {
  const { t, dateLocale } = useI18n();
  const wallets = useUnit(walletModel.$wallets);
  const account = useUnit(walletModel.$accounts).find((a) => a.accountId === notification.multisigAccountId);
  const notificationWallet = wallets.find((w) => w.id === account?.walletId);

  const { dateCreated, type } = notification;

  return (
    <li className="flex flex-col bg-block-background-default rounded">
      <div className="py-4 pl-6 pr-6 flex">
        <FootnoteText className="text-text-tertiary pr-5.5 leading-5">
          {format(new Date(dateCreated || 0), 'p', { locale: dateLocale })}
        </FootnoteText>
        {NotificationBody[type](notification, t, notificationWallet)}
      </div>
    </li>
  );
};
