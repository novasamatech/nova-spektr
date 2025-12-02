import { useUnit } from 'effector-react';
import { useMemo } from 'react';
import { Trans } from 'react-i18next';

import { type MultisigCreated } from '@/shared/core';
import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, Icon } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';

type Props = {
  notification: MultisigCreated;
};

export const MultisigCreatedNotification = ({
  notification: { threshold, signatories, multisigAccountId, multisigAccountName },
}: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const name = useMemo(() => {
    const wallet = wallets.find((w) => w.accounts.some((acc) => acc.accountId === multisigAccountId));
    return wallet?.name || multisigAccountName;
  }, [wallets, multisigAccountId, multisigAccountName]);

  return (
    <Box gap={2} direction="row">
      <div className="pt-0.75">
        <Icon name="info" size={14} className="text-icon-accent" />
      </div>

      <Box gap={4}>
        <Box gap={2}>
          <BodyText>{t('notifications.details.multisigCreatedTitle')}</BodyText>
          <BodyText className="inline-flex flex-wrap items-center gap-y-2">
            <WalletIcon type={WalletType.MULTISIG} />
            &nbsp;
            <Trans
              t={t}
              i18nKey="notifications.details.multisigCreatedDescription"
              values={{
                threshold,
                signatoriesLength: signatories.length,
                name,
              }}
            />
          </BodyText>
        </Box>
      </Box>
    </Box>
  );
};
