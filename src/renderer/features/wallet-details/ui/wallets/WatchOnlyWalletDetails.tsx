import { useGate, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { Button, IconButton } from '@/shared/ui';
import { ChainAccountsList } from '@/shared/ui-entities';
import { Box, Modal, Tabs } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { WalletCardLg, accountUtils, walletUtils } from '@/entities/wallet';
import { proxyAddFeature } from '@/features/proxy-add';
import { ForgetWalletModal } from '@/features/wallets/ForgetWallet';
import { RenameWalletModal } from '@/features/wallets/RenameWallet';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { WalletFiatBalance } from '../components';
import { ProxiesList } from '../components/ProxiesList';

export const overviewSlot = createSlot<{ walletAccounts: AnyAccount[] }>();

const {
  models: { addProxy },
} = proxyAddFeature;

type Props = {
  wallet: Wallet;
  onClose: () => void;
};
export const WatchOnlyWalletDetails = ({ wallet, onClose }: Props) => {
  useGate(walletDetailsModel.flow, { wallet });
  const { t } = useI18n();

  const allChains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletDetailsModel.$hasProxies);
  const canCreateProxy = useUnit(walletDetailsModel.$canCreateProxy);
  const proxiesCount = useUnit(walletDetailsModel.$proxiesCount);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

  const [chains, setChains] = useState<Chain[]>([]);
  const [tab, setTab] = useState('accounts');

  const firstAccount = wallet.accounts.at(0);
  const isEthereumBased = firstAccount ? accountUtils.isEthereumBased(firstAccount) : false;

  useEffect(() => {
    const filteredChains = Object.values(allChains).filter(c => {
      return isEthereumBased ? networkUtils.isEthereumBased(c.options) : !networkUtils.isEthereumBased(c.options);
    });

    setChains(filteredChains);
  }, []);

  const accountsIds = useMemo(
    () => (firstAccount ? Object.values(chains).map(chain => [chain, firstAccount.accountId] as const) : []),
    [chains, firstAccount],
  );

  return (
    <Modal size="mdlg" height="full" isOpen={isModalOpen} onToggle={closeModal}>
      <Modal.Title close>{t('walletDetails.common.title')}</Modal.Title>
      <Modal.HeaderContent>
        <div className="mb-4 flex items-center justify-between px-5 pb-6 pt-4">
          <Box direction="row" verticalAlign="center" gap={3}>
            <span>
              <WalletCardLg wallet={wallet} />
            </span>
            <IconButton name="rename" size={16} onClick={toggleIsRenameModalOpen} />
            <WalletFiatBalance />
          </Box>
          <div className="shrink-0">
            {firstAccount && <Slot id={overviewSlot} props={{ walletAccounts: [firstAccount] }} />}
            <Button pallet="error" size="sm" variant="fill" onClick={toggleConfirmForget}>
              {t('walletDetails.common.forgetButton')}
            </Button>
          </div>
        </div>
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

        <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

        <ForgetWalletModal
          wallet={wallet}
          isOpen={isConfirmForgetOpen}
          onClose={toggleConfirmForget}
          onForget={onClose}
        />
      </Modal.Content>
    </Modal>
  );
};
