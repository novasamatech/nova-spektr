import { useUnit } from 'effector-react';

import { type MultiShardWallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { BaseModal, DropdownIconButton, Tabs } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';
import { type TabItem } from '@/shared/ui/types';
import { networkModel } from '@/entities/network';
import { MultishardAccountsList, WalletCardLg, permissionUtils } from '@/entities/wallet';
import { ForgetWalletModal } from '@/features/wallets/ForgetWallet';
import { RenameWalletModal } from '@/features/wallets/RenameWallet';
import { AddProxy, addProxyModel } from '@/widgets/AddProxyModal';
import { AddPureProxied, addPureProxiedModel } from '@/widgets/AddPureProxiedModal';
import { type MultishardMap } from '../../lib/types';
import { walletDetailsUtils } from '../../lib/utils';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { ProxiesList } from '../components/ProxiesList';

type Props = {
  wallet: MultiShardWallet;
  accounts: MultishardMap;
  onClose: () => void;
};
export const MultishardWalletDetails = ({ wallet, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletProviderModel.$hasProxies);
  const canCreateProxy = useUnit(walletProviderModel.$canCreateProxy);

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
      panel: <MultishardAccountsList accounts={accounts} chains={Object.values(chains)} className="h-[387px]" />,
    },
    {
      id: 'proxies',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: hasProxies ? (
        <ProxiesList className="mt-4 h-[371px]" canCreateProxy={canCreateProxy} />
      ) : (
        <NoProxiesAction
          className="mt-4 h-[371px]"
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
      <div className="flex w-full flex-col gap-y-4">
        <div className="border-b border-divider px-5 py-6">
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

      <AddProxy />
      <AddPureProxied />
    </BaseModal>
  );
};
