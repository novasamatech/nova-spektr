import { useUnit } from 'effector-react';

import { BaseModal, DropdownIconButton, Tabs } from '@shared/ui';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { AccountsList, WalletCardLg, walletUtils } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { useI18n } from '@app/providers';
import type { BaseAccount, ProxyAccount, Wallet } from '@shared/core';
import { IconNames } from '@shared/ui/Icon/data';
import { RenameWalletModal } from '@features/wallets/RenameWallet';
import { ForgetWalletModal } from '@features/wallets/ForgetWallet';
import { TabItem } from '@shared/ui/Tabs/common/types';
import { ProxiesList } from './ProxiesList';
import { proxyModel } from '@entities/proxy';
import { ProxyType } from '@shared/core';

const mockProxies = [
  {
    id: 1,
    accountId: '0xc6332dd72fc6d33bf202a531e66cfaf46e6161640f91864f23f82b31b38c5f11',
    proxiedAccountId: '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    chainId: '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e',
    proxyType: ProxyType.GOVERNANCE,
    delay: 0,
  },
  {
    id: 2,
    accountId: '0xc6332dd72fc6d33bf202a531e66cfaf46e6161640f91864f23f82b31b38c5f11',
    proxiedAccountId: '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    proxyType: ProxyType.NON_TRANSFER,
    delay: 0,
  },
  {
    id: 3,
    accountId: '0xc6332dd72fc6d33bf202a531e66cfaf46e6161640f91864f23f82b31b38c5f11',
    proxiedAccountId: '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    proxyType: ProxyType.ANY,
    delay: 0,
  },
  {
    id: 4,
    accountId: '0xc6332dd72fc6d33bf202a531e66cfaf46e6161640f91864f23f82b31b38c5f11',
    proxiedAccountId: '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    proxyType: ProxyType.ANY,
    delay: 0,
  },
  {
    id: 5,
    accountId: '0xc6332dd72fc6d33bf202a531e66cfaf46e6161640f91864f23f82b31b38c5f11',
    proxiedAccountId: '0x08eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
    chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    proxyType: ProxyType.ANY,
    delay: 0,
  },
];

type Props = {
  wallet: Wallet;
  account: BaseAccount;
  onClose: () => void;
};
export const SimpleWalletDetails = ({ wallet, account, onClose }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const proxies = useUnit(proxyModel.$proxies);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

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

  const ActionButton = (
    <DropdownIconButton name="more">
      <DropdownIconButton.Items>
        {Options.map((option) => (
          <DropdownIconButton.Item key={option.icon}>
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
      panel: <AccountsList accountId={account.accountId} chains={Object.values(chains)} className="h-[351px]" />,
    },
    {
      id: 'proxies',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: (
        <ProxiesList
          canCreateProxy={!walletUtils.isWatchOnly(wallet)}
          walletId={wallet.id}
          proxies={mockProxies as ProxyAccount[]}
          // proxies={proxies[account.accountId]}
          chains={Object.values(chains)}
          className="h-[376px]"
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
        {walletUtils.isWatchOnly(wallet) && proxies[account.accountId]?.length ? (
          <AccountsList accountId={account.accountId} chains={Object.values(chains)} className="h-[351px]" />
        ) : (
          <Tabs items={tabItems} panelClassName="" tabsClassName="mx-5" />
        )}
      </div>

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

      <ForgetWalletModal
        wallet={wallet}
        isOpen={isConfirmForgetOpen}
        onClose={toggleConfirmForget}
        onForget={onClose}
      />
    </BaseModal>
  );
};
