import { useGate, useStoreMap, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { isEthereumAccountId, toAddress } from '@/shared/lib/utils';
import { HeadlineText, IconButton, Separator } from '@/shared/ui';
import { ChainAccountsList, ConsensusAccountsList, WalletAccountIcon } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea, Tabs } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, permissionUtils, walletUtils } from '@/entities/wallet';
import { AddPureProxied } from '@/features/proxied-add-pure';
import { AddProxy } from '@/features/proxy-add';
import { ForgetWalletConfirm } from '@/features/wallets/ForgetWallet';
import { RenameWallet } from '@/features/wallets/RenameWallet';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { walletProxiesModel } from '../../model/wallet-proxies-model';
import { WalletFiatBalance } from '../components';
import { ProxiesCount } from '../components/ProxiesCount';
import { ProxiesList } from '../components/ProxiesList';
import { Action, type WalletAction, WalletActions } from '../components/WalletActions';

export const overviewSlot = createSlot<{ walletAccounts: AnyAccount[] }>();

type Props = {
  wallet: Wallet;
  onClose: () => void;
};
export const SimpleWalletDetails = ({ wallet, onClose }: Props) => {
  useGate(walletDetailsModel.flow, { wallet });
  useGate(walletProxiesModel.flow, { wallet });
  const { t } = useI18n();

  const allChains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletProxiesModel.$hasWalletProxies);
  const canCreateProxy = useUnit(walletDetailsModel.$canCreateProxy);
  const proxiesCount = useUnit(walletProxiesModel.$walletProxiesCount);

  const firstAccount = useStoreMap({
    store: accounts.$list,
    keys: [wallet.id],
    fn: (accounts, [walletId]) => accountService.filterAccountsByWallet(accounts, walletId).at(0),
  });

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameInputOpen, toggleIsRenameInputOpen] = useToggle();

  const [chains, setChains] = useState<Chain[]>([]);
  const [tab, setTab] = useState('accounts');

  const isEthereumBased = firstAccount ? accountUtils.isEthereumBased(firstAccount) : false;

  useEffect(() => {
    const filteredChains = Object.values(allChains).filter(c => {
      return isEthereumBased ? networkUtils.isEthereumBased(c.options) : !networkUtils.isEthereumBased(c.options);
    });

    setChains(filteredChains);
  }, []);

  const actions: WalletAction[] = [];

  if (permissionUtils.canCreateAnyProxy(wallet) || permissionUtils.canCreateNonAnyProxy(wallet)) {
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

  actions.push({
    component: (
      <ForgetWalletConfirm wallet={wallet} onForget={onClose}>
        <Action title={t('walletDetails.common.forgetButton')} icon="forget" variant="danger" />
      </ForgetWalletConfirm>
    ),
  });

  const accountsIds = useMemo(
    () => (firstAccount ? Object.values(chains).map(chain => [chain, firstAccount.accountId] as const) : []),
    [chains, firstAccount],
  );

  return (
    <Modal size="mdlg" height="full" isOpen={isModalOpen} onToggle={closeModal}>
      <Modal.Title close>{t('walletDetails.common.title')}</Modal.Title>
      <Modal.HeaderContent>
        <div className="mb-6 flex items-center justify-between px-5">
          <Box direction="row" verticalAlign="center" gap={2} height="fit">
            <div className="mr-1">
              <WalletAccountIcon
                address={firstAccount?.accountId && toAddress(firstAccount?.accountId)}
                type={wallet.type}
                size={42}
                theme={isEthereumAccountId(firstAccount?.accountId) ? 'ethereum' : 'polkadot'}
              />
            </div>

            {!isRenameInputOpen && (
              <>
                <HeadlineText className="ml-1 truncate text-text-primary" as="h3">
                  {wallet.name}
                </HeadlineText>
                <div className="flex shrink-0 items-center gap-3 duration-300 animate-in fade-in-0">
                  <IconButton name="rename" size={16} onClick={toggleIsRenameInputOpen} />
                  <WalletFiatBalance />
                </div>
              </>
            )}
          </Box>

          <RenameWallet wallet={wallet} isOpen={isRenameInputOpen} onClose={toggleIsRenameInputOpen} />

          {firstAccount && !isRenameInputOpen && (
            <div className="ml-2 shrink-0 duration-300 animate-in fade-in-0">
              <Slot id={overviewSlot} props={{ walletAccounts: [firstAccount] }} />
            </div>
          )}
        </div>

        <WalletActions actions={actions} />

        <Separator className="my-6" />
      </Modal.HeaderContent>
      <Modal.Content disableScroll>
        {walletUtils.isWatchOnly(wallet) && !hasProxies ? (
          <ChainAccountsList accounts={accountsIds} />
        ) : (
          <Tabs value={tab} onChange={setTab}>
            <Box padding={[0, 5]} shrink={0}>
              <Tabs.List>
                <Tabs.Trigger value="accounts">
                  <span className="flex items-center gap-1">
                    {t('walletDetails.common.accountTabTitle')}
                    <span className="text-text-tertiary">{accountsIds.length}</span>
                  </span>
                </Tabs.Trigger>
                <Tabs.Trigger value="proxies">
                  <span className="flex items-center gap-1">
                    {t('walletDetails.common.proxiesTabTitle')}
                    <ProxiesCount count={proxiesCount} />
                  </span>
                </Tabs.Trigger>
              </Tabs.List>
            </Box>
            <Tabs.Content value="accounts">
              {isEthereumBased ? (
                <ChainAccountsList accounts={accountsIds} />
              ) : (
                <ConsensusAccountsList accounts={accountsIds} />
              )}
            </Tabs.Content>
            <Tabs.Content value="proxies">
              <ScrollArea>
                <ProxiesList wallet={wallet} hasProxies={hasProxies} canCreateProxy={canCreateProxy} />
              </ScrollArea>
            </Tabs.Content>
          </Tabs>
        )}
      </Modal.Content>
    </Modal>
  );
};
