import { useEffect, useMemo } from 'react';
import { useUnit } from 'effector-react';
import keyBy from 'lodash/keyBy';

import wallet_connect_reconnect_webm from '@video/wallet_connect_reconnect.webm';
import wallet_connect_reconnect from '@video/wallet_connect_reconnect.mp4';
import { useModalClose, useToggle } from '@renderer/shared/lib/hooks';
import { MultiAccountsList, WalletIcon } from '@renderer/entities/wallet';
import { useI18n } from '@renderer/app/providers';
import { chainsService } from '@renderer/entities/network';
import { walletConnectUtils } from '@renderer/entities/walletConnect';
import type { Wallet, Chain, Account } from '@renderer/shared/core';
import { wcDetailsModel } from '../model/wc-details-model';
import { wcDetailsUtils, walletDetailsUtils } from '../lib/utils';
import { ForgetStep } from '../lib/constants';
import {
  Animation,
  BaseModal,
  BodyText,
  Button,
  ConfirmModal,
  FootnoteText,
  HeaderTitleText,
  Icon,
  IconButton,
  MenuPopover,
  StatusLabel,
  SmallTitleText,
  StatusModal,
} from '@renderer/shared/ui';

type AccountItem = {
  accountId: `0x${string}`;
  chain: Chain;
};

type Props = {
  wallet: Wallet;
  accounts: Account[];
  isConnected: boolean;
  onClose: () => void;
};
export const WalletConnectDetails = ({ wallet, accounts, isConnected, onClose }: Props) => {
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
    const sortedChains = chainsService.sortChains(chainsService.getChainsData());

    const accountsMap = keyBy(accounts, 'chainId');

    return sortedChains.reduce<AccountItem[]>((acc, chain) => {
      const accountId = accountsMap[chain.chainId]?.accountId;

      if (accountId) {
        acc.push({ accountId, chain });
      }

      return acc;
    }, []);
  }, [accounts]);

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
                  onClick={reconnect}
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
        <div className="flex items-center justify-between gap-x-2 p-5 border-b border-divider">
          <div className="flex items-center justify-between gap-x-2">
            <WalletIcon type={wallet.type} size={32} />
            <BodyText>{wallet.name}</BodyText>
          </div>
          <StatusLabel
            variant={isConnected ? 'success' : 'waiting'}
            title={t(
              isConnected
                ? 'walletDetails.walletConnect.connectedStatus'
                : 'walletDetails.walletConnect.disconnectedStatus',
            )}
          />
        </div>

        <div className="px-3 flex-1">
          <>
            {wcDetailsUtils.isNotStarted(reconnectStep, isConnected) && (
              <MultiAccountsList accounts={accountsList} className="h-[404px]" />
            )}

            {wcDetailsUtils.isReadyToReconnect(reconnectStep, isConnected) && (
              <div className="flex flex-col h-[454px] justify-center items-center">
                <Icon name="document" size={64} className="mb-6" />
                <SmallTitleText className="mb-2">{t('walletDetails.walletConnect.disconnectedTitle')}</SmallTitleText>
                <FootnoteText className="mb-4 text-text-tertiary">
                  {t('walletDetails.walletConnect.disconnectedDescription')}
                </FootnoteText>
                <Button onClick={reconnect}>{t('walletDetails.walletConnect.reconnectButton')}</Button>
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
