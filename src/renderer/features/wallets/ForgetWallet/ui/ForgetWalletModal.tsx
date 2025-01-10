import { useEffect } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { ConfirmModal, FootnoteText, SmallTitleText } from '@/shared/ui';
import { forgetWalletModel } from '../model/forget-wallet-model';

type Props = {
  wallet: Wallet;
  isOpen: boolean;
  onClose: () => void;
  onForget: () => void;
};

export const ForgetWalletModal = ({ wallet, isOpen, onClose, onForget }: Props) => {
  const { t } = useI18n();

  useEffect(() => {
    forgetWalletModel.events.callbacksChanged({ onDeleteFinished: onForget });
  }, [onForget]);

  return (
    <ConfirmModal
      isOpen={isOpen}
      cancelText={t('walletDetails.common.cancelButton')}
      confirmText={t('walletDetails.common.forgetButton')}
      confirmPallet="error"
      panelClass="w-[240px]"
      onClose={onClose}
      onConfirm={() => forgetWalletModel.events.forgetWallet(wallet)}
    >
      <SmallTitleText align="center" className="mb-2">
        {t('walletDetails.common.removeWalletTitle')}
      </SmallTitleText>
      <FootnoteText className="break-words text-text-tertiary" align="center">
        {t('walletDetails.common.removeWalletDesc', { walletName: wallet.name })}
      </FootnoteText>
    </ConfirmModal>
  );
};
