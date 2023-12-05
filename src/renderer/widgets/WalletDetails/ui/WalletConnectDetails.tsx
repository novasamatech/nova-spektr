import { useEffect, useMemo } from 'react';
import { useUnit } from 'effector-react';
import keyBy from 'lodash/keyBy';

import wallet_connect_reconnect_webm from '@shared/assets/video/wallet_connect_reconnect.webm';
import wallet_connect_reconnect from '@shared/assets/video/wallet_connect_reconnect.mp4';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { MultiAccountsList, WalletCardLg } from '@entities/wallet';
import { useI18n } from '@app/providers';
import { chainsService } from '@entities/network';
import { walletConnectUtils } from '@entities/walletConnect';
import type { Chain, Account, WalletConnectWallet } from '@shared/core';
import { wcDetailsModel } from '../model/wc-details-model';
import { wcDetailsUtils, walletDetailsUtils } from '../lib/utils';
import { ForgetStep } from '../lib/constants';
import {
  Animation,
  BaseModal,
  Button,
  ConfirmModal,
  FootnoteText,
  HeaderTitleText,
  Icon,
  IconButton,
  MenuPopover,
  SmallTitleText,
  StatusModal,
} from '@shared/ui';

type AccountItem = {
  accountId: `0x${string}`;
  chain: Chain;
};

type Props = {
  wallet: WalletConnectWallet;
  accounts: Account[];
  onClose: () => void;
};
export const WalletConnectDetails = ({ wallet, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle(false);

  const reconnectStep = useUnit(wcDetailsModel.$reconnectStep);
  const forgetStep = useUnit(wcDetailsModel.$forgetStep);

  useEffect(() => {
    wcDetailsModel.events.reset();
  }, []);

  // TODO: Rework with https://app.clickup.com/t/8692ykm3y
  const accountsList = useMemo(() => {
    const sortedChains = chainsService.getChainsData({ sort: true });

    const accountsMap = keyBy(accounts, 'chainId');

    return sortedChains.reduce<AccountItem[]>((acc, chain) => {
      const accountId = accountsMap[chain.chainId]?.accountId;

      if (accountId) {
        acc.push({ accountId, chain });
      }

      return acc;
    }, []);
  }, [accounts]);

  const showReconnectConfirm = () => {
    wcDetailsModel.events.confirmReconnectShown();
  };

  const reconnect = () => {
    wcDetailsModel.events.reconnectStarted({
      chains: walletConnectUtils.getWalletConnectChains(chainsService.getChainsData()),
      pairing: { topic: accounts[0].signingExtras?.pairingTopic },
      currentSession: accounts[0].signingExtras?.sessionTopic,
    });
  };

  const handleForgetWallet = () => {
    wcDetailsModel.events.forgetButtonClicked();
    toggleConfirmForget();
  };

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="h-modal"
      title={
        <div className="flex items-center">
          <HeaderTitleText className="flex-1 truncate">{t('walletDetails.common.title')}</HeaderTitleText>

          <MenuPopover
            className="w-[98px] p-0"
            position="top-full right-0"
            buttonClassName="rounded-full"
            offsetPx={0}
            closeOnClick
            content={
              <>
                <Button
                  variant="text"
                  size="md"
                  className="text-text-secondary hover:text-text-secondary px-2"
                  prefixElement={<Icon name="delete" size={20} className="text-icon-accent" />}
                  onClick={toggleConfirmForget}
                >
                  {t('walletDetails.common.forgetButton')}
                </Button>

                <Button
                  variant="text"
                  size="md"
                  className="text-text-secondary hover:text-text-secondary px-2"
                  prefixElement={<Icon name="refresh" size={20} className="text-icon-accent" />}
                  onClick={showReconnectConfirm}
                >
                  {t('walletDetails.walletConnect.refreshButton')}
                </Button>
              </>
            }
          >
            <IconButton name="options" className="p-1.5" />
          </MenuPopover>
        </div>
      }
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <div className="flex flex-col h-full w-full">
        <div className="py-5 px-5 border-b border-divider">
          <WalletCardLg full wallet={wallet} />
        </div>
        <div className="px-3 flex-1">
          <>
            {wcDetailsUtils.isNotStarted(reconnectStep, wallet.isConnected) && (
              <MultiAccountsList accounts={accountsList} className="h-[391px]" />
            )}

            {wcDetailsUtils.isReadyToReconnect(reconnectStep, wallet.isConnected) && (
              <div className="flex flex-col h-[454px] justify-center items-center">
                <Icon name="document" size={64} className="mb-6 text-icon-default" />
                <SmallTitleText className="mb-2">{t('walletDetails.walletConnect.disconnectedTitle')}</SmallTitleText>
                <FootnoteText className="mb-4 text-text-tertiary">
                  {t('walletDetails.walletConnect.disconnectedDescription')}
                </FootnoteText>
                <Button onClick={showReconnectConfirm}>{t('walletDetails.walletConnect.reconnectButton')}</Button>
              </div>
            )}

            {wcDetailsUtils.isReconnecting(reconnectStep) && (
              <div className="flex flex-col h-[454px] justify-center items-center">
                <video className="object-contain h-[454px]" autoPlay loop>
                  <source src={wallet_connect_reconnect_webm} type="video/webm" />
                  <source src={wallet_connect_reconnect} type="video/mp4" />
                </video>
              </div>
            )}
          </>
        </div>

        <ConfirmModal
          panelClass="w-[300px]"
          isOpen={wcDetailsUtils.isConfirmation(reconnectStep)}
          confirmText={t('walletDetails.walletConnect.confirmButton')}
          cancelText={t('walletDetails.common.cancelButton')}
          onConfirm={reconnect}
          onClose={wcDetailsModel.events.reconnectAborted}
        >
          <SmallTitleText className="mb-2" align="center">
            {t('walletDetails.walletConnect.reconnectConfirmTitle')}
          </SmallTitleText>
          <FootnoteText className="text-text-tertiary" align="center">
            {t('walletDetails.walletConnect.reconnectConfirmDescription')}
          </FootnoteText>
        </ConfirmModal>

        <ConfirmModal
          panelClass="w-[300px]"
          isOpen={isConfirmForgetOpen}
          confirmText={t('walletDetails.common.removeButton')}
          cancelText={t('walletDetails.common.cancelButton')}
          confirmPallet="error"
          onConfirm={handleForgetWallet}
          onClose={toggleConfirmForget}
        >
          <SmallTitleText className="mb-2" align="center">
            {t('walletDetails.common.removeTitle')}
          </SmallTitleText>
          <FootnoteText className="text-text-tertiary" align="center">
            {t('walletDetails.common.removeMessage', { walletName: wallet.name })}
          </FootnoteText>
        </ConfirmModal>

        <StatusModal
          isOpen={walletDetailsUtils.isForgetModalOpen(forgetStep)}
          title={t(
            forgetStep === ForgetStep.FORGETTING
              ? 'walletDetails.common.removingWallet'
              : 'walletDetails.common.walletRemoved',
          )}
          content={
            forgetStep === ForgetStep.FORGETTING ? (
              <Animation variant="loading" loop />
            ) : (
              <Animation variant="success" />
            )
          }
          onClose={wcDetailsModel.events.forgetModalClosed}
        />

        <StatusModal
          isOpen={wcDetailsUtils.isRejected(reconnectStep)}
          title={t('walletDetails.walletConnect.rejectTitle')}
          description={t('walletDetails.walletConnect.rejectDescription')}
          content={<Animation variant="error" />}
          onClose={wcDetailsModel.events.reconnectAborted}
        >
          <Button onClick={() => wcDetailsModel.events.reconnectAborted()}>
            {t('walletDetails.walletConnect.abortRejectButton')}
          </Button>
        </StatusModal>
      </div>
    </BaseModal>
  );
};
