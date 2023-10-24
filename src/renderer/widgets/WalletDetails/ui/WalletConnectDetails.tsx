import { useEffect, useMemo } from 'react';
import keyBy from 'lodash/keyBy';

import {
  BaseModal,
  BodyText,
  Button,
  HeaderTitleText,
  Icon,
  IconButton,
  MenuPopover,
  StatusLabel,
} from '@renderer/shared/ui';
import { useModalClose } from '@renderer/shared/lib/hooks';
import { MultiAccountsList, WalletIcon } from '@renderer/entities/wallet';
import { useI18n } from '@renderer/app/providers';
import { chainsService } from '@renderer/entities/network';
import type { Wallet, Chain, Account } from '@renderer/shared/core';
import { getWalletConnectChains } from '@renderer/entities/walletConnect';
import { walletConnectDetailsModel } from '../model/wallet-connect-details-model';
import { wcDetailsUtils } from '../lib/utils';

type AccountItem = {
  accountId: `0x${string}`;
  chain: Chain;
};

type Props = {
  isOpen: boolean;
  wallet: Wallet;
  accounts: Account[];
  isConnected: boolean;
  onClose: () => void;
};
export const WalletConnectDetails = ({ isOpen, wallet, accounts, isConnected, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(isOpen, onClose);

  const connected = useUnit(walletConnectDetailsModel.$connected);
  const reconnectStep = useUnit(walletConnectDetailsModel.$reconnectStep);

  useEffect(() => {
    if (isModalOpen) return;

    walletConnectDetailsModel.events.reset();
  }, [isModalOpen]);

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
  }, []);

  const reconnect = () => {
    walletConnectDetailsModel.events.reconnectStarted({
      chains: getWalletConnectChains(chainsService.getChainsData()),
      pairing: { topic: accounts[0].signingExtras?.pairingTopic },
    });
  };

  const isAccountsStep = wcDetailsUtils.isNotStarted(reconnectStep, connected);
  const isReconnectingStep = wcDetailsUtils.isReconnecting(reconnectStep);
  const isReadyToReconnectStep = wcDetailsUtils.isReadyToReconnect(reconnectStep, connected);
  const isRejected = wcDetailsUtils.isRejected(reconnectStep);

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
            content={
              <Button
                variant="text"
                size="md"
                className="text-text-secondary hover:text-text-secondary px-2"
                prefixElement={<Icon name="refresh" size={20} className="text-icon-accent" />}
                onClick={reconnect}
              >
                {t('walletDetails.walletConnect.refreshButton')}
              </Button>
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
            {isAccountsStep && <MultiAccountsList accounts={accountsList} className="h-[404px]" />}

            {isReadyToReconnectStep && (
              <div className="flex flex-col h-[454px] justify-center items-center">
                <Icon name="document" size={64} className="mb-6" />
                <SmallTitleText className="mb-2">{t('walletDetails.walletConnect.disconnectedTitle')}</SmallTitleText>
                <FootnoteText className="mb-4 text-text-tertiary">
                  {t('walletDetails.walletConnect.disconnectedDescription')}
                </FootnoteText>
                <Button onClick={reconnect}>{t('walletDetails.walletConnect.reconnectButton')}</Button>
              </div>
            )}

            {isReconnectingStep && (
              <div className="flex flex-col h-[454px] justify-center items-center">
                <video className="object-contain h-[454px]" autoPlay loop>
                  <source src={wallet_connect_reconnect_webm} type="video/webm" />
                  <source src={wallet_connect_reconnect} type="video/mp4" />
                </video>
              </div>
            )}
          </>
        </div>

        <StatusModal
          isOpen={isRejected}
          title={t('walletDetails.walletConnect.rejectTitle')}
          description={t('walletDetails.walletConnect.rejectDescription')}
          content={<Animation variant="error" />}
          onClose={walletConnectDetailsModel.events.reconnectAborted}
        >
          <Button onClick={() => walletConnectDetailsModel.events.reconnectAborted()}>
            {t('walletDetails.walletConnect.abortRejectButton')}
          </Button>
        </StatusModal>
      </div>
    </BaseModal>
  );
};
