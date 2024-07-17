import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';

import type { Chain, SingleShardWallet, WatchOnlyWallet } from '@shared/core';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { BaseModal, DropdownIconButton, Tabs } from '@shared/ui';
import { type IconNames } from '@shared/ui/Icon/data';
import { type TabItem } from '@shared/ui/types';

import { networkModel, networkUtils } from '@entities/network';
import { AccountsList, WalletCardLg, accountUtils, permissionUtils, walletUtils } from '@entities/wallet';

import { ForgetWalletModal } from '@features/wallets/ForgetWallet';
import { RenameWalletModal } from '@features/wallets/RenameWallet';

import { AddProxy, addProxyModel } from '@widgets/AddProxyModal';
import { AddPureProxied, addPureProxiedModel } from '@widgets/AddPureProxiedModal';

import { walletProviderModel } from '../../model/wallet-provider-model';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { ProxiesList } from '../components/ProxiesList';

type Props = {
  wallet: SingleShardWallet | WatchOnlyWallet;
  onClose: () => void;
};
export const SimpleWalletDetails = ({ wallet, onClose }: Props) => {
  const { t } = useI18n();

  const allChains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletProviderModel.$hasProxies);
  const canCreateProxy = useUnit(walletProviderModel.$canCreateProxy);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

  const [chains, setChains] = useState<Chain[]>([]);

  const isEthereumBased = accountUtils.isEthereumBased(wallet.accounts[0]);

  useEffect(() => {
    const filteredChains = Object.values(allChains).filter((c) => {
      return isEthereumBased ? networkUtils.isEthereumBased(c.options) : !networkUtils.isEthereumBased(c.options);
    });

    setChains(filteredChains);
  }, []);

  const Options = [
    {
      icon: 'rename' as IconNames,
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
    },
    {
      icon: 'forget' as IconNames,
      title: t('walletDetails.common.forgetButton'),
      onClick: toggleConfirmForget,
    },
  ];

  if (permissionUtils.canCreateAnyProxy(wallet) || permissionUtils.canCreateNonAnyProxy(wallet)) {
    Options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxyModel.events.flowStarted,
    });
  }

  if (permissionUtils.canCreateAnyProxy(wallet)) {
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
      panel: (
        <AccountsList accountId={wallet.accounts[0].accountId} chains={Object.values(chains)} className="h-[362px]" />
      ),
    },
    {
      id: 'proxies',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: hasProxies ? (
        <ProxiesList canCreateProxy={canCreateProxy} className="h-[388px]" />
      ) : (
        <NoProxiesAction
          className="h-[388px]"
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
      <div className="flex flex-col gap-y-4 w-full">
        <div className="py-6 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>
        {walletUtils.isWatchOnly(wallet) && !hasProxies ? (
          <AccountsList accountId={wallet.accounts[0].accountId} chains={Object.values(chains)} className="h-[412px]" />
        ) : (
          <Tabs items={tabItems} panelClassName="" tabsClassName="mx-5" unmount={false} />
        )}
      </div>

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

      <ForgetWalletModal
        wallet={wallet}
        isOpen={isConfirmForgetOpen}
        onClose={toggleConfirmForget}
        onForget={onClose}
      />

      <AddProxy />
      <AddPureProxied />
    </BaseModal>
  );
};
