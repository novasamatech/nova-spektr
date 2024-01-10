import { useUnit } from 'effector-react';

import { BaseModal, DropdownIconButton, Tabs } from '@shared/ui';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { MultishardAccountsList, WalletCardLg } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { useI18n } from '@app/providers';
import type { Wallet } from '@shared/core';
import type { MultishardMap } from '../lib/types';
import { walletDetailsUtils } from '../lib/utils';
import { RenameWalletModal } from '@features/wallets/RenameWallet';
import { IconNames } from '@shared/ui/Icon/data';
import { ForgetWalletModal } from '@features/wallets/ForgetWallet';
import { proxyModel } from '@entities/proxy';
import { walletProviderModel } from '../model/wallet-provider-model';
import { Account, AccountId, ProxyAccount } from '@shared/core';
import { TabItem } from '@shared/ui/Tabs/common/types';
import { ProxiesList } from '@widgets/WalletDetails/ui/ProxiesList';

type Props = {
  wallet: Wallet;
  accounts: MultishardMap;
  onClose: () => void;
};
export const MultishardWalletDetails = ({ wallet, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const proxies = useUnit(proxyModel.$proxies);
  const accountsIds = useUnit(walletProviderModel.$accounts).map((a: Account) => a.accountId);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

  const proxyAccounts = accountsIds.reduce((acc: ProxyAccount[], accountId: AccountId) => {
    if (proxies[accountId]) {
      acc.push(...proxies[accountId]);
    }

    return acc;
  }, []);

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
      panel: <MultishardAccountsList accounts={accounts} chains={Object.values(chains)} className="h-[409px]" />,
    },
    {
      id: 'proxies',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: (
        <ProxiesList
          walletId={wallet.id}
          proxies={proxyAccounts}
          chains={Object.values(chains)}
          className="h-[393px] mt-4"
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
      <div className="flex flex-col w-full">
        <div className="py-6 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>
        <Tabs items={tabItems} panelClassName="" tabsClassName="mx-5" />
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
