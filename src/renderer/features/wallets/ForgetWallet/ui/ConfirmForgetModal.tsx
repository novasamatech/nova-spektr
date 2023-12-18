import { useEffect } from 'react';

import { Wallet } from '@shared/core';
import { ConfirmModal, FootnoteText, HeaderTitleText } from '@shared/ui';
import { useI18n } from '@app/providers';
import { forgetWalletModel } from '../model/forget-wallet-model';
import { walletUtils } from '@entities/wallet';

type Props = {
  wallet: Wallet;
  isOpen: boolean;
  onClose: () => void;
  onForget: () => void;
};

export const ConfirmForgetModal = ({ wallet, isOpen, onClose, onForget }: Props) => {
  const { t } = useI18n();

  useEffect(() => {
    forgetWalletModel.events.callbacksChanged({ onDeleteFinished: onForget });
  }, [onForget]);

  const confirmForgetWallet = () => {
    if (walletUtils.isMultisig(wallet)) {
      forgetWalletModel.events.forgetMultisigWallet(wallet);

      return;
    }

    forgetWalletModel.events.forgetSimpleWallet(wallet);
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      cancelText={t('walletDetails.common.cancelButton')}
      confirmText={t('walletDetails.common.forgetButton')}
      confirmPallet="error"
      panelClass="w-[240px]"
      onClose={onClose}
      onConfirm={confirmForgetWallet}
    >
      <HeaderTitleText align="center" className="mb-2">
        {t('walletDetails.common.removeWalletTitle')}
      </HeaderTitleText>
      <FootnoteText className="text-text-tertiary" align="center">
        {t('walletDetails.common.removeWalletDesc', { walletName: wallet.name })}
      </FootnoteText>
    </ConfirmModal>
  );
};
