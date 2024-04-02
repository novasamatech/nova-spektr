import { useEffect } from 'react';
import { useUnit } from 'effector-react';

import { useModalClose, useToggle } from '@shared/lib/hooks';
import { WalletCardLg, permissionUtils } from '@entities/wallet';
import { useI18n } from '@app/providers';
import { chainsService } from '@shared/api/network';
import { walletConnectUtils } from '@entities/walletConnect';
import type { Account, WalletConnectWallet } from '@shared/core';
import { wcDetailsModel } from '../../model/wc-details-model';
import { wcDetailsUtils, walletDetailsUtils } from '../../lib/utils';
import { ForgetStep } from '../../lib/constants';
import { Animation } from '@shared/ui/Animation/Animation';
import { IconNames } from '@shared/ui/Icon/data';
import { RenameWalletModal } from '@features/wallets/RenameWallet';
import { forgetWalletModel } from '@features/wallets/ForgetWallet';
import { TabItem } from '@shared/ui/Tabs/common/types';
import { addProxyModel, AddProxy } from '@widgets/AddProxyModal';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { WalletConnectAccounts } from '../components/WalletConnectAccounts';
import { ProxiesList } from '../components/ProxiesList';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { AddPureProxied, addPureProxiedModel } from '@widgets/AddPureProxiedModal';
import {
  BaseModal,
  Button,
  ConfirmModal,
  DropdownIconButton,
  FootnoteText,
  SmallTitleText,
  StatusModal,
  Tabs,
} from '@shared/ui';

type Props = {
  wallet: WalletConnectWallet;
  accounts: Account[];
  onClose: () => void;
};
export const WalletConnectDetails = ({ wallet, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const hasProxies = useUnit(walletProviderModel.$hasProxies);
  const forgetStep = useUnit(wcDetailsModel.$forgetStep);
  const reconnectStep = useUnit(wcDetailsModel.$reconnectStep);
  const canCreateProxy = useUnit(walletProviderModel.$canCreateProxy);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();

  useEffect(() => {
    wcDetailsModel.events.reset();
  }, []);

  const reconnect = () => {
    wcDetailsModel.events.reconnectStarted({
      chains: walletConnectUtils.getWalletConnectChains(chainsService.getChainsData()),
      pairing: { topic: accounts[0].signingExtras?.pairingTopic },
      currentSession: accounts[0].signingExtras?.sessionTopic,
    });
  };

  const handleForgetWallet = () => {
    wcDetailsModel.events.forgetButtonClicked(wallet);
    forgetWalletModel.events.forgetWcWallet(wallet);
    toggleConfirmForget();
  };

  const Options = [
    {
      icon: 'rename' as IconNames,
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
    },
    {
      icon: 'delete' as IconNames,
      title: t('walletDetails.common.forgetButton'),
      onClick: toggleConfirmForget,
    },
    {
      icon: 'refresh' as IconNames,
      title: t('walletDetails.walletConnect.refreshButton'),
      onClick: wcDetailsModel.events.confirmReconnectShown,
    },
  ];

  if (permissionUtils.canCreateAnyProxy(wallet, accounts) || permissionUtils.canCreateNonAnyProxy(wallet, accounts)) {
    Options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxyModel.events.flowStarted,
    });
  }

  if (permissionUtils.canCreateAnyProxy(wallet, accounts)) {
    Options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addPureProxiedAction'),
      onClick: addPureProxiedModel.events.flowStarted,
    });
  }

  const ActionButton = (
    <DropdownIconButton name="more">
      <DropdownIconButton.Items>
        {Options.map((option) => (
          <DropdownIconButton.Item key={option.title}>
            <DropdownIconButton.Option option={option} />
          </DropdownIconButton.Item>
        ))}
      </DropdownIconButton.Items>
    </DropdownIconButton>
  );

  const tabItems: TabItem[] = [
    {
      id: 'accounts',
      title: t('walletDetails.common.accountTabTitle'),
      panel: <WalletConnectAccounts wallet={wallet} accounts={accounts} />,
    },
    {
      id: 'proxies',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: hasProxies ? (
        <ProxiesList className="h-[379px] mt-6" canCreateProxy={canCreateProxy} />
      ) : (
        <NoProxiesAction
          className="h-[379px] mt-6"
          canCreateProxy={canCreateProxy}
          onAddProxy={addProxyModel.events.flowStarted}
        />
      ),
    },
  ];

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="h-modal"
      title={t('walletDetails.common.title')}
      actionButton={ActionButton}
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <div className="flex flex-col gap-y-4 h-full w-full">
        <div className="py-6 px-5 border-b border-divider">
          <WalletCardLg full wallet={wallet} />
        </div>
        <div className="px-3 flex-1">
          <Tabs
            items={tabItems}
            panelClassName=""
            tabClassName="whitespace-nowrap"
            tabsClassName="mx-5"
            unmount={false}
          />
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
          panelClass="w-[240px]"
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

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

      <AddProxy />
      <AddPureProxied />
    </BaseModal>
  );
};
