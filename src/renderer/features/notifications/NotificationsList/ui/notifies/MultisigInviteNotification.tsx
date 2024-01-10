import { Trans } from 'react-i18next';

import { WalletIcon } from '@entities/wallet';
import type { MultisigInvite } from '@shared/core';
import { WalletType } from '@shared/core';
import { BodyText } from '@shared/ui';
import { useI18n } from '@app/providers';

type Props = {
  notification: MultisigInvite;
};

export const MultisigInviteNotification = ({ notification }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex gap-x-2">
      <WalletIcon type={WalletType.MULTISIG} />
      <div className="flex flex-col gap-y-2">
        <BodyText>{t('notifications.details.multisigInviteTitle')}</BodyText>
        <BodyText className="inline-flex">
          <Trans
            t={t}
            i18nKey="notifications.details.multisigInviteDescription"
            values={{
              threshold: notification.threshold,
              signatories: notification.signatories.length,
              name: notification.multisigAccountName,
            }}
          />
        </BodyText>
      </div>
    </div>
  );
};
