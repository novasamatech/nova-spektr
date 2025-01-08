import { useGate, useUnit } from 'effector-react';
import { useEffect, useState, useTransition } from 'react';

import { chainsService } from '@/shared/api/network';
import { type WalletConnectGroup } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { Button, ConfirmModal, FootnoteText, Icon, IconButton, SmallTitleText, StatusModal } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { type IconNames } from '@/shared/ui/Icon/data';
import { Dropdown, Modal, Tabs } from '@/shared/ui-kit';
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
  const [_, startTransition] = useTransition();

  const [tab, setTab] = useState('accounts');
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

  const options = [
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
    options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxy.events.flowStarted,
    });
  }

  if (permissionUtils.canCreateAnyProxy(wallet)) {
    options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addPureProxiedAction'),
      onClick: addPureProxied.events.flowStarted,
    });
  }

  const ActionButton = (
    <Dropdown align="end">
      <Dropdown.Trigger>
        <IconButton name="more" />
      </Dropdown.Trigger>
      <Dropdown.Content>
        {options.map(option => (
          <Dropdown.Item key={option.title} onSelect={option.onClick}>
            <Icon name={option.icon} size={20} className="text-icon-accent" />
            <span className="text-text-secondary">{option.title}</span>
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );

  const changeTab = (tab: string) => {
    startTransition(() => {
      setTab(tab);
    });
  };

  return (
    <>
      <Modal size="md" height="lg" isOpen={isModalOpen} onToggle={closeModal}>
        <Modal.Title close action={ActionButton}>
          {t('walletDetails.common.title')}
        </Modal.Title>
        <Modal.HeaderContent>
          <div className="mb-5 border-b border-divider px-5 py-6">
            <WalletCardLg full wallet={wallet} />
          </div>
        </Modal.HeaderContent>
        <Modal.Content disableScroll>
          <Tabs value={tab} onChange={changeTab}>
            <div className="px-5">
              <Tabs.List>
                <Tabs.Trigger value="accounts">{t('walletDetails.common.accountTabTitle')}</Tabs.Trigger>
                <Tabs.Trigger value="proxies">{t('walletDetails.common.proxiesTabTitle')}</Tabs.Trigger>
              </Tabs.List>
            </div>
            <Tabs.Content value="accounts">
              <WalletConnectAccounts wallet={wallet} />
            </Tabs.Content>
            <Tabs.Content value="proxies">
              {hasProxies ? (
                <ProxiesList className="h-[379px]" wallet={wallet} canCreateProxy={canCreateProxy} />
              ) : (
                <NoProxiesAction
                  className="h-[379px]"
                  canCreateProxy={canCreateProxy}
                  onAddProxy={addProxy.events.flowStarted}
                />
              )}
            </Tabs.Content>
          </Tabs>
        </Modal.Content>
      </Modal>

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
          forgetStep === ForgetStep.FORGETTING ? <Animation variant="loading" loop /> : <Animation variant="success" />
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

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

      <AddProxy wallet={wallet} />
      <AddPureProxied wallet={wallet} />
    </>
  );
};
