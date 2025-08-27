import { Trans } from 'react-i18next';

import { type MultisigCreated } from '@/shared/core';
import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';

type Props = {
  notification: MultisigCreated;
};

export const MultisigCreatedNotification = ({
  notification: { threshold, signatories, multisigAccountName },
}: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex gap-x-2">
      <div className="relative">
        <WalletIcon type={WalletType.MULTISIG} />
        <div className="absolute top-[13px] -right-px h-2 w-2 rounded-full border border-white bg-icon-positive" />
      </div>

      <div className="flex flex-col gap-y-2">
        <BodyText>{t('notifications.details.multisigCreatedTitle')}</BodyText>
        <BodyText className="inline-flex flex-wrap items-center gap-y-2">
          <Trans
            t={t}
            i18nKey="notifications.details.multisigCreatedDescription"
            values={{
              threshold,
              signatoriesLength: signatories.length,
              name: multisigAccountName,
            }}
          />
        </BodyText>
      </div>
    </div>
  );
};
