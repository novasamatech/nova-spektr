import { useGate, useUnit } from 'effector-react';
import { useEffect } from 'react';

import { chainsService } from '@/shared/api/network';
import { type WalletConnectGroup } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import {
  BaseModal,
  Button,
  ConfirmModal,
  DropdownIconButton,
  FootnoteText,
  SmallTitleText,
  StatusModal,
  Tabs,
} from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { type IconNames } from '@/shared/ui/Icon/data';
import { type TabItem } from '@/shared/ui/types';
import { WalletCardLg, permissionUtils } from '@/entities/wallet';
import { walletConnectUtils } from '@/entities/walletConnect';
import { proxyAddFeature } from '@/features/proxy-add';
import { proxyAddPureFeature } from '@/features/proxy-add-pure';
import { forgetWalletModel } from '@/features/wallets/ForgetWallet';
import { RenameWalletModal } from '@/features/wallets/RenameWallet';
import { ForgetStep } from '../../lib/constants';
import { walletDetailsUtils, wcDetailsUtils } from '../../lib/utils';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { wcDetailsModel } from '../../model/wc-details-model';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { ProxiesList } from '../components/ProxiesList';
import { WalletConnectAccounts } from '../components/WalletConnectAccounts';

const {
  models: { addProxy },
  views: { AddProxy },
} = proxyAddFeature;

const {
  models: { addPureProxied },
  views: { AddPureProxied },
} = proxyAddPureFeature;

type Props = {
  wallet: WalletConnectGroup;
  onClose: () => void;
};
export const WalletConnectDetails = ({ wallet, onClose }: Props) => {
  useGate(wcDetailsModel.walletConnectDetailsFlow, { wallet });
  const { t } = useI18n();

  const hasProxies = useUnit(walletDetailsModel.$hasProxies);
  const forgetStep = useUnit(wcDetailsModel.$forgetStep);
  const reconnectStep = useUnit(wcDetailsModel.$reconnectStep);
  const canCreateProxy = useUnit(walletDetailsModel.$canCreateProxy);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();

  useEffect(() => {
    wcDetailsModel.events.reset();
  }, []);

  const reconnect = () => {
    wcDetailsModel.events.reconnectStarted({
      chains: walletConnectUtils.getWalletConnectChains(chainsService.getChainsData()),
      pairing: { topic: wallet.accounts[0].signingExtras?.pairingTopic },
      currentSession: wallet.accounts[0].signingExtras?.sessionTopic,
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

  if (permissionUtils.canCreateAnyProxy(wallet) || permissionUtils.canCreateNonAnyProxy(wallet)) {
    Options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxy.events.flowStarted,
    });
  }

  if (permissionUtils.canCreateAnyProxy(wallet)) {
    Options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addPureProxiedAction'),
      onClick: addPureProxied.events.flowStarted,
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
      panel: <WalletConnectAccounts wallet={wallet} />,
    },
    {
      id: 'proxies',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: hasProxies ? (
        <ProxiesList className="mt-6 h-[379px]" wallet={wallet} canCreateProxy={canCreateProxy} />
      ) : (
        <NoProxiesAction
          className="mt-6 h-[379px]"
          canCreateProxy={canCreateProxy}
          onAddProxy={addProxy.events.flowStarted}
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
      <div className="flex h-full w-full flex-col gap-y-4">
        <div className="border-b border-divider px-5 py-6">
          <WalletCardLg full wallet={wallet} />
        </div>
        <div className="flex-1 px-3">
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

      <AddProxy wallet={wallet} />
      <AddPureProxied wallet={wallet} />
    </BaseModal>
  );
};
