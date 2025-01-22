import { useUnit } from 'effector-react';
import { useState } from 'react';

import { type ProxiedWallet, type ProxyType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { FootnoteText, Icon, IconButton } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';
import { ChainAccountsList } from '@/shared/ui-entities';
import { Box, Dropdown, Modal, Tabs } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { WalletCardLg, WalletIcon, walletModel, walletUtils } from '@/entities/wallet';
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

  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [tab, setTab] = useState('accounts');

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

  if (canCreateProxy) {
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

  const handleToggle = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Modal size="md" height="lg" isOpen={true} onToggle={handleToggle}>
      <Modal.Title close action={ActionButton}>
        {t('walletDetails.common.title')}
      </Modal.Title>
      <Modal.HeaderContent>
        <div className="mb-4 flex flex-col gap-y-2.5 border-b border-divider px-5 pb-6 pt-4">
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
      </Modal.HeaderContent>
      <Modal.Content>
        <Tabs value={tab} onChange={setTab}>
          <Box padding={[0, 5]} shrink={0}>
            <Tabs.List>
              <Tabs.Trigger value="accounts">{t('walletDetails.common.accountTabTitle')}</Tabs.Trigger>
              <Tabs.Trigger value="proxies">{t('walletDetails.common.proxiesTabTitle')}</Tabs.Trigger>
            </Tabs.List>
          </Box>
          <Tabs.Content value="accounts">
            <ChainAccountsList accounts={accounts} />
          </Tabs.Content>
          <Tabs.Content value="proxies">
            {hasProxies ? (
              <ProxiesList canCreateProxy={canCreateProxy} wallet={wallet} className="h-[361px]" />
            ) : (
              <NoProxiesAction
                className="h-[361px]"
                canCreateProxy={canCreateProxy}
                onAddProxy={addProxy.events.flowStarted}
              />
            )}
          </Tabs.Content>
        </Tabs>
      </Modal.Content>

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />
      <AddProxy wallet={wallet} />
      <AddPureProxied wallet={wallet} />
    </Modal>
  );
};
