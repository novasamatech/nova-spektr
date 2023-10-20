import { useEffect, useMemo } from 'react';
import { useUnit } from 'effector-react';
import keyBy from 'lodash/keyBy';

import { Wallet, Chain, Account } from '@renderer/shared/core';
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
  SmallTitleText,
  StatusLabel,
  StatusModal,
} from '@renderer/shared/ui';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';
import { MultiAccountsList, WalletIcon } from '@renderer/entities/wallet';
import { useI18n } from '@renderer/app/providers';
import { chainsService } from '@renderer/entities/network';
import { walletProviderModel } from '../model/wallet-provider-model';
import { getWalletConnectChains, walletConnectModel } from '@renderer/entities/walletConnect';
import { ForgetStep, ReconnectStep } from '../common/const';
import wallet_connect_reconnect from '@video/wallet_connect_reconnect.mp4';
import wallet_connect_reconnect_webm from '@video/wallet_connect_reconnect.webm';

type AccountItem = {
  accountId: `0x${string}`;
  chain: Chain;
};

type Props = {
  isOpen: boolean;
  wallet: Wallet;
  accounts: Account[];
  onClose: () => void;
};
export const WalletConnectDetails = ({ isOpen, wallet, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle(false);

  const connected = useUnit(walletProviderModel.$connected);
  const reset = useUnit(walletProviderModel.events.reset);
  const connect = useUnit(walletConnectModel.events.connect);
  const reconnectStarted = useUnit(walletProviderModel.events.reconnectStarted);
  const reconnectAborted = useUnit(walletProviderModel.events.reconnectAborted);
  const forgetWallet = useUnit(walletProviderModel.events.forgetButtonClicked);
  const closeForgetModal = useUnit(walletProviderModel.events.forgetModalClosed);
  const reconnectStep = useUnit(walletProviderModel.$reconnectStep);
  const forgetStep = useUnit(walletProviderModel.$forgetStep);

  useEffect(() => {
    if (isModalOpen) {
      reset();
    }
  }, [isModalOpen]);

  const closeModal = () => {
    toggleIsModalOpen();

    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  // TODO: Rework with https://app.clickup.com/t/8692ykm3y
  const accountsList = useMemo(() => {
    const sortedChains = chainsService.sortChains(chainsService.getChainsData());

    const accountsMap = keyBy(accounts, 'chainId');

    const accountsList = sortedChains.reduce<AccountItem[]>((acc, chain) => {
      const accountId = accountsMap[chain.chainId]?.accountId;

      if (accountId) {
        acc.push({ accountId, chain });
      }

      return acc;
    }, []);

    return accountsList;
  }, []);

  const reconnect = () => {
    connect({
      chains: getWalletConnectChains(chainsService.getChainsData()),
      pairing: { topic: accounts[0].signingExtras?.pairingTopic },
    });

    reconnectStarted();
  };

  const isAccountsStep = reconnectStep === ReconnectStep.NOT_STARTED && connected;
  const isReconnectingStep = reconnectStep === ReconnectStep.RECONNECTING;
  const isReadyToReconnectStep =
    (reconnectStep === ReconnectStep.NOT_STARTED && !connected) || reconnectStep === ReconnectStep.REJECTED;

  return (
    <BaseModal
      closeButton
      contentClass=""
      title={
        <div className="flex items-center">
          <HeaderTitleText className="flex-1 truncate">{t('walletDetails.common.title')}</HeaderTitleText>

          <MenuPopover
            className="w-[98px] p-0"
            position="top-full right-0"
            buttonClassName="rounded-full"
            offsetPx={0}
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
            variant={connected ? 'success' : 'waiting'}
            title={t(
              connected
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

        <ConfirmModal
          panelClass="w-[300px]"
          isOpen={isConfirmForgetOpen}
          confirmText={t('walletDetails.common.removeButton')}
          cancelText={t('walletDetails.common.cancelButton')}
          confirmPallet="error"
          onConfirm={() => {
            forgetWallet();
            toggleConfirmForget();
          }}
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
          isOpen={[ForgetStep.FORGETTING, ForgetStep.SUCCESS].includes(forgetStep)}
          title={t(
            forgetStep === ForgetStep.FORGETTING
              ? 'walletDetails.common.removingWallet'
              : 'walletDetails.common.walletRemoved',
          )}
          content={
            forgetStep === ForgetStep.FORGETTING ? <Animation variant="loading" /> : <Animation variant="success" />
          }
          onClose={closeForgetModal}
        />

        <StatusModal
          isOpen={reconnectStep === ReconnectStep.REJECTED}
          title={t('walletDetails.walletConnect.rejectTitle')}
          description={t('walletDetails.walletConnect.rejectDescription')}
          content={<Animation variant="error" />}
          onClose={reconnectAborted}
        >
          <Button onClick={reconnectAborted}>{t('walletDetails.walletConnect.abortRejectButton')}</Button>
        </StatusModal>
      </div>
    </BaseModal>
  );
};
