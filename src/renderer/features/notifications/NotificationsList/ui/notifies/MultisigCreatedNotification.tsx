import { Trans } from 'react-i18next';

import { type MultisigCreated } from '@/shared/core';
import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, Icon } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';

type Props = {
  notification: MultisigCreated;
};

export const MultisigCreatedNotification = ({
  notification: { threshold, signatories, multisigAccountName },
}: Props) => {
  const { t } = useI18n();

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
                name: multisigAccountName,
              }}
            />
          </BodyText>
        </Box>
      </Box>
    </Box>
  );
};
