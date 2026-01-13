import { Trans } from 'react-i18next';

import { NotificationType, WalletType } from '@/shared/core';
import { type FlexibleMultisigOperationNotification } from '@/shared/core/types/notification';
import { useI18n } from '@/shared/i18n';
import { BodyText } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';

type Props = {
  notification: FlexibleMultisigOperationNotification;
};

export const FlexibleMultisigNotification = ({ notification }: Props) => {
  const { t } = useI18n();

  const { threshold, signatories, accountName, chainId } = notification;

  const isEdited = notification.type === NotificationType.FLEXIBLE_MULTISIG_EDITED;
  const titleKey = isEdited
    ? 'notifications.details.flexibleMultisigEditedTitle'
    : 'notifications.details.flexibleMultisigCreatedTitle';
  const descriptionKey = 'notifications.details.flexibleMultisigDescription';

  return (
    <Box gap={2} direction="row">
      <div className="relative">
        <WalletIcon type={WalletType.FLEXIBLE_MULTISIG} />
        <div className="absolute top-[13px] -right-px h-2 w-2 rounded-full border border-white bg-icon-positive" />
      </div>

      <Box gap={4}>
        <Box gap={2}>
          <BodyText>{t(titleKey)}</BodyText>
          <BodyText className="inline-flex flex-wrap items-center gap-y-2">
            <Trans
              t={t}
              i18nKey={descriptionKey}
              values={{
                threshold,
                signatoriesLength: signatories.length,
                name: accountName,
              }}
              components={{
                chain: chainId ? (
                  <span className="mx-1">
                    <ChainTitle chainId={chainId} fontClass="text-text-primary text-body" className="gap-x-1" />
                  </span>
                ) : (
                  <span />
                ),
              }}
            />
          </BodyText>
        </Box>
      </Box>
    </Box>
  );
};
