import { combine } from 'effector';
import { useUnit } from 'effector-react';
import { useMemo } from 'react';
import { Trans } from 'react-i18next';

import { NotificationType, WalletType } from '@/shared/core';
import { type FlexibleMultisigOperationNotification } from '@/shared/core/types/notification';
import { useI18n } from '@/shared/i18n';
import { toShortAddress } from '@/shared/lib/utils';
import { BodyText, Icon } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { accountUtils, walletModel } from '@/entities/wallet';

type Props = {
  notification: FlexibleMultisigOperationNotification;
};

export const FlexibleMultisigNotification = ({ notification }: Props) => {
  const { t } = useI18n();

  const { threshold, signatories, accountId, walletId } = notification;

  const $walletAccounts = useMemo(
    () => combine(accounts.$list, (accountsList) => accountsList.filter((account) => account.walletId === walletId)),
    [walletId],
  );

  const walletAccounts = useUnit($walletAccounts);
  const wallets = useUnit(walletModel.$wallets);

  const walletName = useMemo(() => {
    const wallet = wallets.find((w) => w.id === walletId);
    return wallet?.name || toShortAddress(accountId, 5);
  }, [wallets, walletId, accountId]);

  const chainId = useMemo(() => {
    const flexibleMultisigAccount = walletAccounts.find(accountUtils.isFlexibleMultisigAccount);
    return flexibleMultisigAccount?.chainId;
  }, [walletAccounts]);

  const isEdited = notification.type === NotificationType.FLEXIBLE_MULTISIG_EDITED;
  const titleKey = isEdited
    ? 'notifications.details.flexibleMultisigEditedTitle'
    : 'notifications.details.flexibleMultisigCreatedTitle';
  const descriptionKey = 'notifications.details.flexibleMultisigDescription';

  return (
    <Box gap={2} direction="row">
      <div className="pt-0.75">
        <Icon name="info" size={14} className="text-icon-accent" />
      </div>

      <Box gap={4}>
        <Box gap={2}>
          <BodyText>{t(titleKey)}</BodyText>
          <BodyText className="inline-flex flex-wrap items-center gap-y-2">
            <WalletIcon type={WalletType.FLEXIBLE_MULTISIG} />
            &nbsp;
            <Trans
              t={t}
              i18nKey={descriptionKey}
              values={{
                threshold,
                signatoriesLength: signatories.length,
                name: walletName,
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
