import { useGate, useUnit } from 'effector-react';
import { useState } from 'react';

import { type Chain, type ProxiedWallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { isEthereumAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, HeadlineText, Icon, IconButton, Separator } from '@/shared/ui';
import { AccountExplorers, Address, WalletAccountIcon, WalletIcon } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea, Tabs } from '@/shared/ui-kit';
import { type AnyAccount, useAccountName, useWalletName } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { permissionUtils, walletModel, walletUtils } from '@/entities/wallet';
import { AddPureProxied } from '@/features/proxied-add-pure';
import { AddProxy } from '@/features/proxy-add';
import { RenameWallet } from '@/features/wallets/RenameWallet';
import { proxiesModel } from '../../model/proxies-model';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { walletProxiesModel } from '../../model/wallet-proxies-model';
import { WalletFiatBalance } from '../components';
import { type WalletAction, Action, WalletActions } from '../components/WalletActions';
import { ProxiesTab } from '../components/proxies';

export const overviewSlot = createSlot<{ walletAccounts: AnyAccount[] }>();

const ProxiedAccountItem = ({ chain, accountId }: { chain: Chain; accountId: AccountId }) => {
  const accountName = useAccountName({ accountId, chain });

  return (
    <div className="grid grid-cols-2 items-center px-5 pb-3">
      <div className="flex items-center py-4">
        <ChainTitle fontClass="text-text-primary" chain={chain} />
      </div>
      <div className="flex min-w-0 items-center py-4 text-text-secondary">
        <div className="flex w-full min-w-0 items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Address
              showIcon
              variant="truncate"
              title={accountName}
              address={toAddress(accountId, { prefix: chain.addressPrefix })}
            />
          </div>
          <AccountExplorers accountId={accountId} chain={chain} />
        </div>
      </div>
    </div>
  );
};

type Props = {
  wallet: ProxiedWallet;
  onClose: () => void;
};

export const ProxiedWalletDetails = ({ wallet, onClose }: Props) => {
  useGate(walletDetailsModel.flow, { wallet });
  useGate(walletProxiesModel.flow, { wallet });

  const { t } = useI18n();
  const walletName = useWalletName(wallet);

  const chains = useUnit(networkModel.$chains);
  const wallets = useUnit(walletModel.$wallets);
  const canCreateProxy = useUnit(walletDetailsModel.$canCreateProxy);

  const [isRenameInputOpen, toggleIsRenameInputOpen] = useToggle();
  const [tab, setTab] = useState<'accounts' | 'proxies'>('accounts');
  const proxiesCount = useUnit(proxiesModel.$totalCount);
  const handleTabChange = (value: string) => {
    if (value === 'accounts' || value === 'proxies') setTab(value);
  };

  if (!wallet || !walletUtils.isProxied(wallet)) return null;

  const proxyWallets =
    wallet.accounts[0]?.connections.map(connection => ({
      connection,
      proxyWallet: walletUtils.getWalletFilteredAccounts(wallets, {
        walletFn: w => !walletUtils.isWatchOnly(w),
        accountFn: a => connection.proxyAccountId === a.accountId,
      }),
    })) ?? [];

  const actions: WalletAction[] = [];

  if (canCreateProxy) {
    actions.push({
      component: (
        <AddProxy wallet={wallet}>
          <Action title={t('walletDetails.common.addProxyAction')} icon="delegate" />
        </AddProxy>
      ),
    });
  }

  if (permissionUtils.canCreateAnyProxy(wallet)) {
    actions.push({
      component: (
        <AddPureProxied wallet={wallet}>
          <Action title={t('walletDetails.common.addPureProxiedAction')} icon="createPureProxy" />
        </AddPureProxied>
      ),
    });
  }

  //todo uncomment when we can hide proxied wallets
  // actions.push({
  //   component: (
  //     <ForgetWalletConfirm wallet={wallet} onForget={onClose}>
  //       <Action title={t('walletDetails.common.forgetButton')} icon="forget" variant="danger" />
  //     </ForgetWalletConfirm>
  //   ),
  // });

  const account = wallet.accounts.at(0);
  const chain = account ? chains[account.chainId] : null;
  const accounts = account && chain ? [[chain, account.accountId] as const] : [];

  const handleToggle = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Modal size="lg" height="full" isOpen={true} onToggle={handleToggle}>
      <Modal.Title close>{t('walletDetails.common.title')}</Modal.Title>
      <Modal.HeaderContent>
        <div className="flex flex-col gap-y-2.5 px-5 pb-6">
          <div className="flex justify-between">
            <Box direction="row" verticalAlign="center" gap={2}>
              <div className="mr-1">
                <WalletAccountIcon
                  address={account?.accountId && toAddress(account?.accountId, { prefix: chain?.addressPrefix })}
                  type={wallet.type}
                  size={42}
                  theme={isEthereumAccountId(account?.accountId) ? 'ethereum' : 'polkadot'}
                />
              </div>
              {!isRenameInputOpen && (
                <>
                  <HeadlineText className="ml-1 truncate text-text-primary" as="h3">
                    {walletName}
                  </HeadlineText>
                  <div className="flex shrink-0 items-center gap-3 duration-300 animate-in fade-in-0">
                    <IconButton name="rename" size={16} onClick={toggleIsRenameInputOpen} />
                    <WalletFiatBalance />
                  </div>
                </>
              )}
            </Box>

            <RenameWallet wallet={wallet} isOpen={isRenameInputOpen} onClose={toggleIsRenameInputOpen} />

            {account && !isRenameInputOpen && (
              <div className="ml-2 shrink-0 duration-300 animate-in fade-in-0">
                <Slot id={overviewSlot} props={{ walletAccounts: [account] }} />
              </div>
            )}
          </div>

          {proxyWallets.map(
            ({ connection, proxyWallet }) =>
              proxyWallet && (
                <div className="flex items-center pl-4" key={`${connection.proxyType}-${connection.proxyAccountId}`}>
                  <Icon name="arrowCurveLeftRight" size={16} className="mr-1" />
                  <FootnoteText>{t('walletDetails.common.proxyVia')}</FootnoteText>
                  <span className="mx-1">
                    <WalletIcon type={proxyWallet.type} size={16} />
                  </span>
                  <FootnoteText className="truncate">{proxyWallet.name}</FootnoteText>
                  &nbsp;
                  <FootnoteText className="whitespace-nowrap">{t('walletDetails.common.proxyToControl')}</FootnoteText>
                  &nbsp;
                  <FootnoteText className="whitespace-nowrap">{connection.proxyType}</FootnoteText>
                </div>
              ),
          )}
        </div>

        <WalletActions actions={actions} />

        <Separator className="my-6" />
      </Modal.HeaderContent>
      <Modal.Content>
        <Tabs value={tab} onChange={handleTabChange}>
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
                  {t('walletDetails.proxies.tabTitle')}
                  <span className="text-text-tertiary">{proxiesCount}</span>
                </span>
              </Tabs.Trigger>
            </Tabs.List>
          </Box>
          <Tabs.Content value="accounts">
            {account && chain && <ProxiedAccountItem accountId={account.accountId} chain={chain} />}
          </Tabs.Content>
          <Tabs.Content value="proxies">
            <ScrollArea>
              <ProxiesTab wallet={wallet} onCloseWalletDetails={onClose} />
            </ScrollArea>
          </Tabs.Content>
        </Tabs>
      </Modal.Content>
    </Modal>
  );
};
