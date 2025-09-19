import { useGate, useUnit } from 'effector-react';
import { type PropsWithChildren, useEffect, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Animation, FootnoteText, SmallTitleText } from '@/shared/ui';
import { Box, Checkbox, ConfirmModal, useNotification } from '@/shared/ui-kit';
import { walletUtils } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { forgetWalletModel } from '../model/forget-wallet-model';

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClose?: () => void;
  onForget?: () => void;
}>;

export const ForgetWalletConfirm = ({ wallet, onClose, onForget, children }: Props) => {
  useGate(forgetWalletModel.flow, { wallet });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const isWalletToBeHidden = walletUtils.isRegularMultisig(wallet);

  if (isWalletToBeHidden) {
    return (
      <HideWallet
        wallet={wallet}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        onClose={onClose}
        onForget={onForget}
      >
        {children}
      </HideWallet>
    );
  }

  return (
    <ForgetWallet
      wallet={wallet}
      isModalOpen={isModalOpen}
      setIsModalOpen={setIsModalOpen}
      onClose={onClose}
      onForget={onForget}
    >
      {children}
    </ForgetWallet>
  );
};

type HideWalletProps = Props & {
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
};

const HideWallet = ({ onClose, onForget, children, isModalOpen, setIsModalOpen }: HideWalletProps) => {
  const { t } = useI18n();

  const notification = useNotification();

  const isHideWalletDoNotShowAgain = useUnit(forgetWalletModel.$hideWalletDoNotShowAgain);
  const [isHideWalletDoNotShowAgainLocal, setIsHideWalletDoNotShowAgainLocal] = useState(false);

  const multisigOperations = useUnit(selectedWalletMultisigOperations.$list);

  const forgetWallet = () => {
    forgetWalletModel.remove();
    !isHideWalletDoNotShowAgain && forgetWalletModel.changeHideWalletDoNotShowAgain(isHideWalletDoNotShowAgainLocal);
    onForget?.();
    onClose?.();

    let description = t('settings.hiddenWallets.youCanRestore');

    if (multisigOperations.length > 0) {
      description = t('walletDetails.multisig.pendingOperations');
    }

    notification.modal({
      content: (
        <Box width={60} padding={4} gap={1} verticalAlign="center" horizontalAlign="center">
          <Animation variant="success" width={80} height={80} />
          <SmallTitleText>{t('settings.hiddenWallets.walletHidden')}</SmallTitleText>
          <FootnoteText className="text-center text-text-secondary">{description}</FootnoteText>
        </Box>
      ),
    });
  };

  useEffect(() => {
    if (isHideWalletDoNotShowAgain && isModalOpen) {
      forgetWallet();
    }
  }, [isHideWalletDoNotShowAgain, isModalOpen]);

  let description = t('walletDetails.common.youCanRestoreIt');
  if (multisigOperations.length > 0) {
    description = t('walletDetails.multisig.pendingOperations');
  }

  return (
    <ConfirmModal
      isOpen={isModalOpen}
      cancelText={t('walletDetails.common.cancelButton')}
      confirmText={t('walletDetails.common.hideWallet')}
      type="alert"
      title={t('walletDetails.common.walletWillBeHidden')}
      description={
        <>
          {description}
          <Checkbox
            checked={isHideWalletDoNotShowAgainLocal}
            onChange={(checked) => setIsHideWalletDoNotShowAgainLocal(checked)}
          >
            <FootnoteText className="text-text-tertiary" align="left">
              {t('walletDetails.common.doNotShowAgain')}
            </FootnoteText>
          </Checkbox>
        </>
      }
      onToggle={setIsModalOpen}
      onCancel={onClose}
      onConfirm={forgetWallet}
    >
      <ConfirmModal.Trigger>{children}</ConfirmModal.Trigger>
    </ConfirmModal>
  );
};

type ForgetWalletProps = Props & {
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
};

const ForgetWallet = ({ wallet, onClose, onForget, children, isModalOpen, setIsModalOpen }: ForgetWalletProps) => {
  const { t } = useI18n();

  const notification = useNotification();

  const isConnectedAccountsDoNotShowAgain = useUnit(forgetWalletModel.$connectedAccountsDoNotShowAgain);

  const [isConnectedAccountsDoNotShowAgainLocal, setIsConnectedAccountsDoNotShowAgainLocal] = useState(false);

  const isConnectedAccountsAlertNeeded = useUnit(forgetWalletModel.$isConnectedAccountsAlertNeeded);

  const forgetWallet = () => {
    forgetWalletModel.remove();
    !isConnectedAccountsDoNotShowAgain &&
      forgetWalletModel.changeConnectedAccountsDoNotShowAgain(isConnectedAccountsDoNotShowAgainLocal);
    onForget?.();
    onClose?.();

    notification.modal({
      content: (
        <Box width={60} padding={4} gap={1} verticalAlign="center" horizontalAlign="center">
          <Animation variant="success" width={80} height={80} />
          <SmallTitleText>{t('walletDetails.common.walletRemoved')}</SmallTitleText>
        </Box>
      ),
    });
  };

  if (isConnectedAccountsAlertNeeded && !isConnectedAccountsDoNotShowAgain) {
    return (
      <ConfirmModal
        isOpen={isModalOpen}
        cancelText={t('walletDetails.common.cancelButton')}
        confirmText={t('walletDetails.common.forgetButton')}
        type="warning"
        title={t('walletDetails.common.linkedWalletsWillBeRemovedTitle')}
        description={
          <>
            {t('walletDetails.common.linkedWalletsWillBeRemovedDescription')}
            <Checkbox
              checked={isConnectedAccountsDoNotShowAgainLocal}
              onChange={(checked) => setIsConnectedAccountsDoNotShowAgainLocal(checked)}
            >
              <FootnoteText className="text-text-tertiary" align="left">
                {t('walletDetails.common.doNotShowAgain')}
              </FootnoteText>
            </Checkbox>
          </>
        }
        onToggle={setIsModalOpen}
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
      description={
        <span className="break-all">{t('walletDetails.common.removeWalletDesc', { walletName: wallet.name })}</span>
      }
      onCancel={onClose}
      onConfirm={forgetWallet}
    >
      <ConfirmModal.Trigger>{children}</ConfirmModal.Trigger>
    </ConfirmModal>
  );
};
