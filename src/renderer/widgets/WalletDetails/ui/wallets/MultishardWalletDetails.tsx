import { useUnit } from 'effector-react';

import { BaseModal, DropdownIconButton, Tabs } from '@shared/ui';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { MultishardAccountsList, WalletCardLg } from '@entities/wallet';
import { useI18n } from '@app/providers';
import type { Wallet } from '@shared/core';
import { RenameWalletModal } from '@features/wallets/RenameWallet';
import { IconNames } from '@shared/ui/Icon/data';
import { ForgetWalletModal } from '@features/wallets/ForgetWallet';
import { TabItem } from '@shared/ui/Tabs/common/types';
import { networkModel } from '@entities/network';
import { ProxiesList } from '../components/ProxiesList';
import { NoProxiesAction } from '../components/NoProxiesAction';
import type { MultishardMap } from '../../lib/types';
import { walletDetailsUtils } from '../../lib/utils';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { AddProxyModal } from '../../../AddProxyModal';

type Props = {
  wallet: Wallet;
  accounts: MultishardMap;
  onClose: () => void;
};
export const MultishardWalletDetails = ({ wallet, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const hasProxies = useUnit(walletProviderModel.$hasProxies);
  const chains = useUnit(networkModel.$chains);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();
  const [isAddProxyModalOpen, toggleIsAddProxyModalOpen] = useToggle();

  const Options = [
    {
      icon: 'rename' as IconNames,
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
    },
    {
      icon: 'export' as IconNames,
      title: t('walletDetails.vault.export'),
      onClick: () => walletDetailsUtils.exportMultishardWallet(wallet, accounts),
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
      panel: <MultishardAccountsList accounts={accounts} chains={Object.values(chains)} className="h-[419px]" />,
    },
    {
      id: 'proxies',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: hasProxies ? (
        <ProxiesList walletId={wallet.id} className="h-[403px] mt-4" />
      ) : (
        <NoProxiesAction className="h-[403px] mt-4" />
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
      <div className="flex flex-col w-full">
        <div className="py-6 px-5 border-b border-divider">
          <button className="bg-red-50" onClick={toggleIsAddProxyModalOpen}>
            open
          </button>
          <WalletCardLg wallet={wallet} />
        </div>
        <Tabs items={tabItems} panelClassName="" unmount={false} tabsClassName="mx-5" />
      </div>

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

      <ForgetWalletModal
        wallet={wallet}
        isOpen={isConfirmForgetOpen}
        onClose={toggleConfirmForget}
        onForget={onClose}
      />

      <AddProxyModal isOpen={isAddProxyModalOpen} onClose={toggleIsAddProxyModalOpen} />
    </BaseModal>
  );
};
