import { useUnit } from 'effector-react';
import noop from 'lodash/noop';

import { type ProxiedWallet, type ProxyType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { BaseModal, FootnoteText, Icon, IconButton, Tabs } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';
import { type TabItem } from '@/shared/ui/types';
import { ChainAccountsList } from '@/shared/ui-entities';
import { Dropdown } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { WalletCardLg, WalletIcon, permissionUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxyAddFeature } from '@/features/proxy-add';
import { proxyAddPureFeature } from '@/features/proxy-add-pure';
import { RenameWalletModal } from '@/features/wallets/RenameWallet';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { ProxiesList } from '../components/ProxiesList';

const {
  models: { addProxy },
  views: { AddProxy },
} = proxyAddFeature;

const {
  views: { AddPureProxied },
} = proxyAddPureFeature;

const ProxyTypeOperation: Record<ProxyType, string> = {
  Any: 'proxy.operations.any',
  NonTransfer: 'proxy.operations.nonTransfer',
  Staking: 'proxy.operations.staking',
  Auction: 'proxy.operations.auction',
  CancelProxy: 'proxy.operations.cancelProxy',
  Governance: 'proxy.operations.governance',
  IdentityJudgement: 'proxy.operations.identityJudgement',
  NominationPools: 'proxy.operations.nominationPools',
};

type Props = {
  wallet: ProxiedWallet;
  onClose: () => void;
};

export const ProxiedWalletDetails = ({ wallet, onClose }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const hasProxies = useUnit(walletDetailsModel.$hasProxies);
  const canCreateProxy = useUnit(walletDetailsModel.$canCreateProxy);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();

  if (!wallet || !walletUtils.isProxied(wallet)) return null;

  const proxyWallet = walletUtils.getWalletFilteredAccounts(wallets, {
    walletFn: w => !walletUtils.isWatchOnly(w),
    accountFn: a => a.accountId === wallet.accounts[0].proxyAccountId,
  });

  if (!proxyWallet) {
    return null;
  }

  const options = [
    {
      icon: 'rename' as IconNames,
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
    },
  ];

  if (permissionUtils.canCreateAnyProxy(wallet) || permissionUtils.canCreateNonAnyProxy(wallet)) {
    options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxy.events.flowStarted,
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
  const chain = account ? chains[account.chainId] : null;
  const accounts = account && chain ? [[chain, account.accountId] as const] : [];

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
        <ProxiesList className="h-[353px]" wallet={wallet} canCreateProxy={canCreateProxy} />
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

      <AddProxy wallet={wallet} />
      <AddPureProxied wallet={wallet} />
    </BaseModal>
  );
};
