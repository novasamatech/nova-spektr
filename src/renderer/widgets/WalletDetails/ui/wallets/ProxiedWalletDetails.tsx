import { useUnit } from 'effector-react';

import { ProxiedAccount, ProxyType, Wallet } from '@shared/core';
import { useI18n } from '@app/providers';
import { networkModel } from '@entities/network';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { IconNames } from '@shared/ui/Icon/data';
import { BaseModal, DropdownIconButton, FootnoteText, Icon, Tabs } from '@shared/ui';
import { AccountsList, WalletCardLg, WalletIcon } from '@entities/wallet';
import { RenameWalletModal } from '@features/wallets/RenameWallet';
import { TabItem } from '@shared/ui/Tabs/common/types';
import { ProxiesList } from '../components/ProxiesList';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { NoProxiesAction } from '../components/NoProxiesAction';

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
  wallet: Wallet;
  proxyWallet: Wallet;
  proxiedAccount: ProxiedAccount;
  onClose: () => void;
};

export const ProxiedWalletDetails = ({ wallet, proxyWallet, proxiedAccount, onClose }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletProviderModel.$hasProxies);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();

  const Options = [
    {
      icon: 'rename' as IconNames,
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
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
      panel: (
        <AccountsList
          accountId={proxiedAccount.accountId}
          chains={[chains[proxiedAccount.chainId]]}
          className="h-[327px]"
        />
      ),
    },
    {
      id: 'proxies',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: hasProxies ? (
        <ProxiesList walletId={wallet.id} className="h-[353px]" />
      ) : (
        <NoProxiesAction className="h-[353px]" />
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
        <div className="py-6 px-5 border-b border-divider flex flex-col gap-y-2.5">
          <WalletCardLg wallet={wallet} />
          <div className="flex items-center">
            <Icon name="arrowCurveLeftRight" size={16} className="mr-1" />
            <FootnoteText>{t('walletDetails.common.proxyVia')}</FootnoteText>
            <WalletIcon type={proxyWallet.type} size={16} className="mx-1" />
            <FootnoteText>{proxyWallet.name}</FootnoteText>
            &nbsp;
            <FootnoteText>{t('walletDetails.common.proxyToControl')}</FootnoteText>
            &nbsp;
            <FootnoteText>{t(ProxyTypeOperation[proxiedAccount.proxyType])}</FootnoteText>
          </div>
        </div>
        <Tabs items={tabItems} panelClassName="" unmount={false} tabsClassName="mx-5" />
      </div>

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />
    </BaseModal>
  );
};
