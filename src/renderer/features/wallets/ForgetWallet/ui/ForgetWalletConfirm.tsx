import { useGate, useUnit } from 'effector-react';
import { type PropsWithChildren, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Checkbox, ConfirmModal } from '@/shared/ui-kit';
import { forgetWalletModel } from '../model/forget-wallet-model';

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClose?: () => void;
  onForget?: () => void;
}>;

export const ForgetWalletConfirm = ({ wallet, onClose, onForget, children }: Props) => {
  useGate(forgetWalletModel.flow, { wallet });

  const { t } = useI18n();

  const isDoNotShowAgain = useUnit(forgetWalletModel.$doNotShowAgain);

  const [isDoNotShowAgainLocal, setIsDoNotShowAgainLocal] = useState(false);

  const isConnectedAccountsAlertNeeded = useUnit(forgetWalletModel.$isConnectedAccountsAlertNeeded);

  const forgetWallet = () => {
    forgetWalletModel.remove();
    !isDoNotShowAgain && forgetWalletModel.changeDoNotShowAgain(isDoNotShowAgainLocal);
    onForget && onForget();
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
