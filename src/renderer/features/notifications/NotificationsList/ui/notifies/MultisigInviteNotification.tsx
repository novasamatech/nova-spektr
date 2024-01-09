import { Trans } from 'react-i18next';
import { useUnit } from 'effector-react';

import { WalletIcon, walletModel } from '@entities/wallet';
import type { MultisigInvite } from '@shared/core';
import { WalletType } from '@shared/core';
import { BodyText } from '@shared/ui';
import { useI18n } from '@app/providers';

type Props = {
  notification: MultisigInvite;
};

export const MultisigInviteNotification = ({ notification }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const accounts = useUnit(walletModel.$accounts);

  const multisigAccount = accounts.find((a) => a.accountId === notification.multisigAccountId);
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
              threshold: notification.threshold,
              signatories: notification.signatories.length,
              name: notificationWallet?.name || notification.multisigAccountName,
            }}
          />
        </BodyText>
      </div>
    </div>
  );
};
