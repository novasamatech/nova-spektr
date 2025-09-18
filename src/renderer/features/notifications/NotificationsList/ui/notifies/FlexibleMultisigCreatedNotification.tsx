import { Trans } from 'react-i18next';

import { type FlexibleMultisigCreated } from '@/shared/core';
import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, Button } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { walletSelect } from '@/aggregates/wallet-select';

type Props = {
  notification: FlexibleMultisigCreated;
};

export const FlexibleMultisigCreatedNotification = ({
  notification: { threshold, signatories, accountName, walletId },
}: Props) => {
  const { t } = useI18n();

  const switchWallet = () => {
    walletSelect.select(walletId);
  };

  return (
    <Box gap={2} direction="row">
      <div className="relative">
        <WalletIcon type={WalletType.FLEXIBLE_MULTISIG} />
        <div className="absolute top-[13px] -right-px h-2 w-2 rounded-full border border-white bg-icon-positive" />
      </div>

      <Box gap={4}>
        <Box gap={2}>
          <BodyText>{t('notifications.details.multisigCreatedTitle')}</BodyText>
          <BodyText className="inline-flex flex-wrap items-center gap-y-2">
            <Trans
              t={t}
              i18nKey="notifications.details.multisigCreatedDescription"
              values={{
                threshold,
                signatoriesLength: signatories.length,
                name: accountName,
              }}
            />
          </BodyText>
        </Box>

        <Button size="sm" pallet="secondary" onClick={switchWallet}>
          {t('notifications.details.flexibleMultisigWalletSignAction')}
        </Button>
      </Box>
    </Box>
  );
};
