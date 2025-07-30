import { useGate, useUnit } from 'effector-react';
import { useState } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { Checkbox, ConfirmModal } from '@/shared/ui-kit';
import { forgetWalletModel } from '../model/forget-wallet-model';

type Props = {
  wallet: Wallet;
  isOpen: boolean;
  onClose: () => void;
  onForget: () => void;
};

export const ForgetWalletModal = ({ wallet, isOpen, onClose, onForget }: Props) => {
  useGate(forgetWalletModel.gate, { wallet });

  const { t } = useI18n();

  const isDoNotShowAgain = useUnit(forgetWalletModel.$isDoNotShowAgain);

  const [isDoNotShowAgainLocal, setIsDoNotShowAgainLocal] = useState(false);

  const isConnectedAccountsAlertNeeded = useUnit(forgetWalletModel.$isConnectedAccountsAlertNeeded);

  const forgetWallet = () => {
    forgetWalletModel.remove();
    forgetWalletModel.changeDoNotShowAgain(isDoNotShowAgainLocal);
    onForget();
  };

  if (isConnectedAccountsAlertNeeded && !isDoNotShowAgain) {
    return (
      <ConfirmModal
        isOpen={isOpen}
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
      />
    );
  }

  return (
    <ConfirmModal
      isOpen={isOpen}
      cancelText={t('walletDetails.common.cancelButton')}
      confirmText={t('walletDetails.common.forgetButton')}
      type="warning"
      title={t('walletDetails.common.removeWalletTitle')}
      description={t('walletDetails.common.removeWalletDesc', { walletName: wallet.name })}
      onCancel={onClose}
      onConfirm={forgetWallet}
    />
  );
};
