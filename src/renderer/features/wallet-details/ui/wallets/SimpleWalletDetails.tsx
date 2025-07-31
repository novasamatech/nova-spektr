import { useGate, useStoreMap, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { isEthereumAccountId } from '@/shared/lib/utils';
import { HeadlineText, IconButton, Separator } from '@/shared/ui';
import { ChainAccountsList, WalletAccountIcon } from '@/shared/ui-entities';
import { Box, Modal, Tabs } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, permissionUtils, walletUtils } from '@/entities/wallet';
import { proxyAddFeature } from '@/features/proxy-add';
import { proxyAddPureFeature } from '@/features/proxy-add-pure';
import { ForgetWalletConfirm } from '@/features/wallets/ForgetWallet';
import { RenameWallet } from '@/features/wallets/RenameWallet';
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

type Props = {
  wallet: Wallet;
  onClose: () => void;
};
export const SimpleWalletDetails = ({ wallet, onClose }: Props) => {
  useGate(walletDetailsModel.flow, { wallet });
  const { t } = useI18n();

  const allChains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletDetailsModel.$hasProxies);
  const canCreateProxy = useUnit(walletDetailsModel.$canCreateProxy);
  const proxiesCount = useUnit(walletDetailsModel.$proxiesCount);

  const firstAccount = useStoreMap({
    store: accounts.$list,
    keys: [wallet.id],
    fn: (accounts, [walletId]) => accountService.filterAccountsByWallet(accounts, walletId).at(0),
  });

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

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
      icon: 'delegate',
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
    title: t('walletDetails.common.forgetButton'),
    variant: 'danger',
    onClick: toggleConfirmForget,
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
                address={firstAccount?.accountId}
                type={wallet.type}
                size={42}
                theme={isEthereumAccountId(firstAccount?.accountId) ? 'ethereum' : 'polkadot'}
              />
            </div>

            {!isRenameModalOpen && (
              <>
                <HeadlineText className="truncate text-text-primary" as="h3">
                  {wallet.name}
                </HeadlineText>
                <div className="flex shrink-0 items-center gap-3 duration-300 animate-in fade-in-0">
                  <IconButton name="rename" size={16} onClick={toggleIsRenameModalOpen} />
                  <WalletFiatBalance />
                </div>
              </>
            )}
          </Box>

          <RenameWallet wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

          {firstAccount && !isRenameModalOpen && (
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
                    <span className="text-text-tertiary">{proxiesCount}</span>
                  </span>
                </Tabs.Trigger>
              </Tabs.List>
            </Box>
            <Tabs.Content value="accounts">
              <ChainAccountsList accounts={accountsIds} />
            </Tabs.Content>
            <Tabs.Content value="proxies">
              <ProxiesList
                wallet={wallet}
                hasProxies={hasProxies}
                canCreateProxy={canCreateProxy}
                className="h-[388px]"
                onAddProxy={addProxy.events.flowStarted}
              />
            </Tabs.Content>
          </Tabs>
        )}

        <ForgetWalletConfirm
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
