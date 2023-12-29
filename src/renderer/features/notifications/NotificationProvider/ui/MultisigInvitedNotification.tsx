import { Trans } from 'react-i18next';
import { useUnit } from 'effector-react';

import { MultisigAccountInvitedNotification, MultisigNotification, Notification } from '@entities/notification';
import { WalletIcon, walletModel } from '@entities/wallet';
import { WalletType } from '@shared/core';
import { BodyText } from '@shared/ui';
import { useI18n } from '@app/providers';

type Props = {
  notification: Notification;
};

export const MultisigInvitedNotification = ({ notification }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const accounts = useUnit(walletModel.$accounts);

  const typedNotification = notification as Notification & MultisigNotification & MultisigAccountInvitedNotification;
  const multisigAccount = accounts.find((a) => a.accountId === typedNotification.multisigAccountId);
  const notificationWallet = wallets.find((w) => w.id === multisigAccount?.walletId);

  return (
    <div className="flex gap-x-2">
      <WalletIcon type={WalletType.MULTISIG} />
      <div className="flex flex-col gap-y-2">
        <BodyText>{t('notifications.details.newMultisigAccountTitle')}</BodyText>
        <BodyText className="inline-flex">
          <Trans
            t={t}
            i18nKey="notifications.details.newMultisigAccountDescription"
            values={{
              threshold: typedNotification.threshold,
              signatories: typedNotification.signatories.length,
              name: notificationWallet?.name || typedNotification.multisigAccountName,
            }}
          />
        </BodyText>
      </div>
    </div>
  );
};
