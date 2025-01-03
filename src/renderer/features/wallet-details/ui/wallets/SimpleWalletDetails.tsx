import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type Chain, type SingleShardWallet, type WatchOnlyWallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { Icon, IconButton, Tabs } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';
import { type TabItem } from '@/shared/ui/types';
import { ChainAccountsList } from '@/shared/ui-entities';
import { Dropdown, Modal } from '@/shared/ui-kit';
import { networkModel, networkUtils } from '@/entities/network';
import { WalletCardLg, accountUtils, permissionUtils, walletUtils } from '@/entities/wallet';
import { proxyAddFeature } from '@/features/proxy-add';
import { proxyAddPureFeature } from '@/features/proxy-add-pure';
import { ForgetWalletModal } from '@/features/wallets/ForgetWallet';
import { RenameWalletModal } from '@/features/wallets/RenameWallet';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { ProxiesList } from '../components/ProxiesList';

const {
  models: { addProxy },
  views: { AddProxy },
} = proxyAddFeature;

const {
  models: { addPureProxied },
  views: { AddPureProxied },
} = proxyAddPureFeature;

type Props = {
  wallet: SingleShardWallet | WatchOnlyWallet;
  onClose: () => void;
};
export const SimpleWalletDetails = ({ wallet, onClose }: Props) => {
  const { t } = useI18n();

  const allChains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletDetailsModel.$hasProxies);
  const canCreateProxy = useUnit(walletDetailsModel.$canCreateProxy);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

  const [chains, setChains] = useState<Chain[]>([]);

  const isEthereumBased = accountUtils.isEthereumBased(wallet.accounts[0]);

  useEffect(() => {
    const filteredChains = Object.values(allChains).filter(c => {
      return isEthereumBased ? networkUtils.isEthereumBased(c.options) : !networkUtils.isEthereumBased(c.options);
    });

    setChains(filteredChains);
  }, []);

  const options: { icon: IconNames; title: string; onClick: VoidFunction }[] = [
    {
      icon: 'rename',
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
    },
    {
      icon: 'forget',
      title: t('walletDetails.common.forgetButton'),
      onClick: toggleConfirmForget,
    },
  ];

  if (permissionUtils.canCreateAnyProxy(wallet) || permissionUtils.canCreateNonAnyProxy(wallet)) {
    options.push({
      icon: 'addCircle',
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxy.events.flowStarted,
    });
  }

  if (permissionUtils.canCreateAnyProxy(wallet)) {
    options.push({
      icon: 'addCircle',
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

  const account = wallet.accounts.at(0);
  if (!account) return null;

  const accounts = useMemo(
    () => Object.values(chains).map(chain => [chain, account.accountId] as const),
    [chains, account],
  );

  const tabItems: TabItem[] = [
    {
      id: 'accounts',
      title: t('walletDetails.common.accountTabTitle'),
      panel: <ChainAccountsList accounts={accounts} />,
    },
    {
      id: 'proxies',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: hasProxies ? (
        <ProxiesList canCreateProxy={canCreateProxy} wallet={wallet} className="h-[388px]" />
      ) : (
        <NoProxiesAction
          className="h-[388px]"
          canCreateProxy={canCreateProxy}
          onAddProxy={addProxy.events.flowStarted}
        />
      ),
    },
  ];

  return (
    <Modal size="md" height="lg" isOpen={isModalOpen} onToggle={closeModal}>
      <Modal.Title close action={ActionButton}>
        {t('walletDetails.common.title')}
      </Modal.Title>
      <Modal.Content disableScroll>
        <div className="flex min-h-0 w-full flex-col gap-y-2">
          <div className="border-b border-divider px-5 pb-6 pt-4">
            <WalletCardLg wallet={wallet} />
          </div>
          {walletUtils.isWatchOnly(wallet) && !hasProxies ? (
            <ChainAccountsList accounts={accounts} />
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

        <AddProxy wallet={wallet} />
        <AddPureProxied wallet={wallet} />
      </Modal.Content>
    </Modal>
  );
};
