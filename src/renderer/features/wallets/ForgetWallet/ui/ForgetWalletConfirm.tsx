import { useGate, useUnit } from 'effector-react';
import { type PropsWithChildren, useState } from 'react';

import { useNotification } from '@/app/providers';
import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Animation, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box, Checkbox, ConfirmModal } from '@/shared/ui-kit';
import { forgetWalletModel } from '../model/forget-wallet-model';

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClose?: () => void;
  onForget?: () => void;
}>;

export const ForgetWalletConfirm = ({ wallet, onClose, onForget, children }: Props) => {
  useGate(forgetWalletModel.flow, { wallet });

  const { t } = useI18n();

  const notification = useNotification();

  const isDoNotShowAgain = useUnit(forgetWalletModel.$doNotShowAgain);

  const [isDoNotShowAgainLocal, setIsDoNotShowAgainLocal] = useState(false);

  const isConnectedAccountsAlertNeeded = useUnit(forgetWalletModel.$isConnectedAccountsAlertNeeded);

  const forgetWallet = () => {
    forgetWalletModel.remove();
    !isDoNotShowAgain && forgetWalletModel.changeDoNotShowAgain(isDoNotShowAgainLocal);
    onForget && onForget();

    notification.modal({
      content: (
        <Box width={60} padding={4} gap={1} verticalAlign="center" horizontalAlign="center">
          <Animation variant="success" width={80} height={80} />
          <SmallTitleText>{t('settings.hiddenWallets.walletHidden')}</SmallTitleText>
          <FootnoteText className="text-center text-text-secondary">
            {t('settings.hiddenWallets.youCanRestore')}
          </FootnoteText>
        </Box>
      ),
      height: 'fit',
      size: 'fit',
      duration: 3000,
    });
  };

  if (isConnectedAccountsAlertNeeded && !isDoNotShowAgain) {
    return (
      <ConfirmModal
        cancelText={t('walletDetails.common.cancelButton')}
        confirmText={t('walletDetails.common.forgetButton')}
        type="warning"
        title={t('walletDetails.common.linkedWalletsWillBeRemovedTitle')}
        description={
          <>
            {t('walletDetails.common.linkedWalletsWillBeRemovedDescription')}
            <Checkbox checked={isDoNotShowAgainLocal} onChange={(checked) => setIsDoNotShowAgainLocal(checked)}>
              <FootnoteText className="text-text-tertiary" align="left">
                {t('walletDetails.common.doNotShowAgain')}
              </FootnoteText>
            </Checkbox>
          </>
        }
        onCancel={onClose}
        onConfirm={forgetWallet}
      >
        <ConfirmModal.Trigger>{children}</ConfirmModal.Trigger>
      </ConfirmModal>
    );
  }

  return (
    <ConfirmModal
      cancelText={t('walletDetails.common.cancelButton')}
      confirmText={t('walletDetails.common.forgetButton')}
      type="warning"
      title={t('walletDetails.common.removeWalletTitle')}
      description={t('walletDetails.common.removeWalletDesc', { walletName: wallet.name })}
      onCancel={onClose}
      onConfirm={forgetWallet}
    >
      <ConfirmModal.Trigger>{children}</ConfirmModal.Trigger>
    </ConfirmModal>
  );
};
