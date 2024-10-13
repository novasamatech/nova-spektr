import { useUnit } from 'effector-react';
import noop from 'lodash/noop';

import { useI18n } from '@/app/providers';
import { type ProxiedWallet, ProxyType, type Wallet } from '@/shared/core';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { BaseModal, DropdownIconButton, FootnoteText, Icon, Tabs } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';
import { type TabItem } from '@/shared/ui/types';
import { networkModel } from '@/entities/network';
import { AccountsList, WalletCardLg, WalletIcon, permissionUtils } from '@/entities/wallet';
import { RenameWalletModal } from '@/features/wallets/RenameWallet';
import { AddProxy, addProxyModel } from '@/widgets/AddProxyModal';
import { AddPureProxied } from '@/widgets/AddPureProxiedModal';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { ProxiesList } from '../components/ProxiesList';

const ProxyTypeOperation: Record<ProxyType, string> = {
  [ProxyType.ANY]: 'proxy.operations.any',
  [ProxyType.NON_TRANSFER]: 'proxy.operations.nonTransfer',
  [ProxyType.STAKING]: 'proxy.operations.staking',
  [ProxyType.AUCTION]: 'proxy.operations.auction',
  [ProxyType.CANCEL_PROXY]: 'proxy.operations.cancelProxy',
  [ProxyType.GOVERNANCE]: 'proxy.operations.governance',
  [ProxyType.IDENTITY_JUDGEMENT]: 'proxy.operations.identityJudgement',
  [ProxyType.NOMINATION_POOLS]: 'proxy.operations.nominationPools',
};

type Props = {
  wallet: ProxiedWallet;
  proxyWallet: Wallet;
  onClose: () => void;
};

export const ProxiedWalletDetails = ({ wallet, proxyWallet, onClose }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletProviderModel.$hasProxies);
  const canCreateProxy = useUnit(walletProviderModel.$canCreateProxy);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();

  const Options = [
    {
      icon: 'rename' as IconNames,
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
    },
  ];

  if (permissionUtils.canCreateAnyProxy(wallet) || permissionUtils.canCreateNonAnyProxy(wallet)) {
    Options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxyModel.events.flowStarted,
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
        <AccountsList
          accountId={wallet.accounts[0].accountId}
          chains={[chains[wallet.accounts[0].chainId]]}
          className="h-[327px]"
        />
      ),
    },
    {
      id: 'proxies',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: hasProxies ? (
        <ProxiesList className="h-[353px]" canCreateProxy={canCreateProxy} />
      ) : (
        <NoProxiesAction className="h-[353px]" canCreateProxy={canCreateProxy} onAddProxy={noop} />
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
        <div className="flex flex-col gap-y-2.5 border-b border-divider px-5 py-6">
          <WalletCardLg wallet={wallet} />
          <div className="flex items-center">
            <Icon name="arrowCurveLeftRight" size={16} className="mr-1" />
            <FootnoteText>{t('walletDetails.common.proxyVia')}</FootnoteText>
            <WalletIcon type={proxyWallet.type} size={16} className="mx-1" />
            <FootnoteText className="truncate">{proxyWallet.name}</FootnoteText>
            &nbsp;
            <FootnoteText className="whitespace-nowrap">{t('walletDetails.common.proxyToControl')}</FootnoteText>
            &nbsp;
            <FootnoteText className="whitespace-nowrap">
              {t(ProxyTypeOperation[wallet.accounts[0].proxyType])}
            </FootnoteText>
          </div>
        </div>
        <Tabs items={tabItems} panelClassName="" unmount={false} tabsClassName="mx-5" />
      </div>

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

      <AddProxy />
      <AddPureProxied />
    </BaseModal>
  );
};
