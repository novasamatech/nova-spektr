import { useGate, useUnit } from 'effector-react';
import { useState } from 'react';

import { type ProxiedWallet, type ProxyType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { FootnoteText, Icon, IconButton, Separator } from '@/shared/ui';
import { ChainAccountsList } from '@/shared/ui-entities';
import { Box, Modal, Tabs } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { WalletCardLg, WalletIcon, permissionUtils, walletModel, walletUtils } from '@/entities/wallet';
import { proxyAddFeature } from '@/features/proxy-add';
import { proxyAddPureFeature } from '@/features/proxy-add-pure';
import { ForgetWalletModal } from '@/features/wallets/ForgetWallet';
import { RenameWalletModal } from '@/features/wallets/RenameWallet';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { WalletFiatBalance } from '../components';
import { ProxiesList } from '../components/ProxiesList';
import { type WalletAction, WalletActions } from '../components/WalletActions';

export const overviewSlot = createSlot<{ walletAccounts: AnyAccount[] }>();

const {
  models: { addProxy },
  views: { AddProxy },
} = proxyAddFeature;

const {
  models: { addPureProxied },
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
  useGate(walletDetailsModel.flow, { wallet });
  const { t } = useI18n();

  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const hasProxies = useUnit(walletDetailsModel.$hasProxies);
  const proxiesCount = useUnit(walletDetailsModel.$proxiesCount);
  const canCreateProxy = useUnit(walletDetailsModel.$canCreateProxy);

  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [tab, setTab] = useState('accounts');

  if (!wallet || !walletUtils.isProxied(wallet)) return null;

  const proxyWallets = wallet.accounts[0]?.connections.map(connection => ({
    connection,
    proxyWallet: walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: w => !walletUtils.isWatchOnly(w),
      accountFn: a => connection.proxyAccountId === a.accountId,
    }),
  }));

  const actions: WalletAction[] = [];

  if (canCreateProxy) {
    actions.push({
      icon: 'addCircle',
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxy.events.flowStarted,
    });
  }

  if (permissionUtils.canCreateAnyProxy(wallet)) {
    actions.push({
      icon: 'createPureProxy',
      title: t('walletDetails.common.addPureProxiedAction'),
      onClick: addPureProxied.events.flowStarted,
    });
  }
  actions.push({
    icon: 'forget',
    title: t('walletDetails.common.hideButton'),
    onClick: toggleConfirmForget,
  });

  const account = wallet.accounts.at(0);
  const chain = account ? chains[account.chainId] : null;
  const accounts = account && chain ? [[chain, account.accountId] as const] : [];

  const handleToggle = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Modal size="mdlg" height="full" isOpen={true} onToggle={handleToggle}>
      <Modal.Title close>{t('walletDetails.common.title')}</Modal.Title>
      <Modal.HeaderContent>
        <div className="flex flex-col gap-y-2.5 px-5 pb-6">
          <div className="flex items-center justify-between">
            <Box direction="row" verticalAlign="center" gap={3}>
              <span>
                <WalletCardLg wallet={wallet} />
              </span>
              <IconButton name="rename" size={16} onClick={toggleIsRenameModalOpen} />
              <WalletFiatBalance />
            </Box>

            {account && (
              <div className="shrink-0">
                <Slot id={overviewSlot} props={{ walletAccounts: [account] }} />
              </div>
            )}
          </div>

          {proxyWallets.map(
            ({ connection, proxyWallet }) =>
              proxyWallet && (
                <div className="flex items-center" key={`${connection.proxyType}-${connection.proxyAccountId}`}>
                  <Icon name="arrowCurveLeftRight" size={16} className="mr-1" />
                  <FootnoteText>{t('walletDetails.common.proxyVia')}</FootnoteText>
                  <WalletIcon type={proxyWallet?.type} size={16} className="mx-1" />
                  <FootnoteText className="truncate">{proxyWallet.name}</FootnoteText>
                  &nbsp;
                  <FootnoteText className="whitespace-nowrap">{t('walletDetails.common.proxyToControl')}</FootnoteText>
                  &nbsp;
                  <FootnoteText className="whitespace-nowrap">
                    {t(ProxyTypeOperation[connection.proxyType])}
                  </FootnoteText>
                </div>
              ),
          )}
        </div>

        <WalletActions actions={actions} />

        <Separator className="my-6" />
      </Modal.HeaderContent>
      <Modal.Content>
        <Tabs value={tab} onChange={setTab}>
          <Box padding={[0, 5]} shrink={0}>
            <Tabs.List>
              <Tabs.Trigger value="accounts">
                <span className="flex items-center gap-1">
                  {t('walletDetails.common.accountTabTitle')}
                  <span className="text-text-tertiary">{accounts.length}</span>
                </span>
              </Tabs.Trigger>
              <Tabs.Trigger value="proxies">
                <span className="flex items-center gap-1">
                  {t('walletDetails.common.proxiesTabTitle')}
                  <span className="text-text-tertiary">{proxiesCount}</span>
                </span>
              </Tabs.Trigger>
            </Tabs.List>
          </Box>
          <Tabs.Content value="accounts">
            <ChainAccountsList accounts={accounts} />
          </Tabs.Content>
          <Tabs.Content value="proxies">
            <ProxiesList
              wallet={wallet}
              hasProxies={hasProxies}
              canCreateProxy={canCreateProxy}
              className="h-[361px]"
              onAddProxy={addProxy.events.flowStarted}
            />
          </Tabs.Content>
        </Tabs>
      </Modal.Content>

      <ForgetWalletModal
        wallet={wallet}
        isOpen={isConfirmForgetOpen}
        onClose={toggleConfirmForget}
        onForget={onClose}
      />

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />
      <AddProxy wallet={wallet} />
      <AddPureProxied wallet={wallet} />
    </Modal>
  );
};
