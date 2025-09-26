import { useGate, useStoreMap, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { toAddress } from '@/shared/lib/utils';
import { Button, HeadlineText, IconButton } from '@/shared/ui';
import { ChainAccountsList, WalletAccountIcon } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea, Tabs } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { ForgetWalletConfirm } from '@/features/wallets/ForgetWallet';
import { RenameWallet } from '@/features/wallets/RenameWallet';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { walletProxiesModel } from '../../model/wallet-proxies-model';
import { WalletFiatBalance } from '../components';
import { ProxiesCount } from '../components/ProxiesCount';
import { ProxiesList } from '../components/ProxiesList';

export const overviewSlot = createSlot<{ walletAccounts: AnyAccount[] }>();

type Props = {
  wallet: Wallet;
  onClose: () => void;
};
export const WatchOnlyWalletDetails = ({ wallet, onClose }: Props) => {
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

  const accountsIds = useMemo(
    () => (firstAccount ? Object.values(chains).map(chain => [chain, firstAccount.accountId] as const) : []),
    [chains, firstAccount],
  );

  return (
    <Modal size="mdlg" height="full" isOpen={isModalOpen} onToggle={closeModal}>
      <Modal.Title close>{t('walletDetails.common.title')}</Modal.Title>
      <Modal.HeaderContent>
        <div className="mb-4 flex items-center justify-between px-5 pt-4 pb-6">
          <Box direction="row" verticalAlign="center" gap={2}>
            <div className="mr-1">
              <WalletAccountIcon
                address={firstAccount?.accountId && toAddress(firstAccount?.accountId)}
                type={wallet.type}
                size={42}
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

          {!isRenameInputOpen && (
            <div className="ml-2 flex shrink-0 items-center gap-3 duration-300 animate-in fade-in-0">
              {firstAccount && <Slot id={overviewSlot} props={{ walletAccounts: [firstAccount] }} />}
              <ForgetWalletConfirm wallet={wallet} onForget={onClose}>
                <Button pallet="error" size="sm" variant="fill">
                  {t('walletDetails.common.forgetButton')}
                </Button>
              </ForgetWalletConfirm>
            </div>
          )}
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
                    <ProxiesCount count={proxiesCount} />
                  </span>
                </Tabs.Trigger>
              </Tabs.List>
            </Box>
            <Tabs.Content value="accounts">
              <ChainAccountsList accounts={accountsIds} />
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
