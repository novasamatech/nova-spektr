import { Trans } from 'react-i18next';

import { type FlexibleMultisigCreated } from '@/shared/core';
import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, Button } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { WalletIcon, walletModel } from '@/entities/wallet';

type Props = {
  notification: FlexibleMultisigCreated;
};

export const FlexibleMultisigCreatedNotification = ({
  notification: { threshold, signatories, multisigAccountName, chainId, walletId },
}: Props) => {
  const { t } = useI18n();

  const switchWallet = () => {
    walletModel.events.selectWallet(walletId);
  };

  return (
    <Box gap={2} direction="row">
      <div className="relative">
        <WalletIcon type={WalletType.FLEXIBLE_MULTISIG} />
        <div className="absolute -right-[1px] top-[13px] h-2 w-2 rounded-full border border-white bg-icon-positive" />
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
                name: multisigAccountName,
              }}
              components={{
                chain: <ChainTitle chainId={chainId} fontClass="text-text-primary text-body" />,
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
