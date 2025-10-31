import { useGate, useStoreMap, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import {
  type Chain,
  type DraftAccount,
  type PolkadotVaultWallet,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { isEthereumAccountId, nullable, toAddress } from '@/shared/lib/utils';
import { FootnoteText, HeadlineText, HelpText, IconButton, Separator } from '@/shared/ui';
import { Hash, type IdenticonIconTheme, WalletAccountIcon } from '@/shared/ui-entities';
import { Box, Copy, Modal, Popover, ScrollArea, Tabs } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { VaultAccountsList, accountUtils, permissionUtils } from '@/entities/wallet';
import { AddPureProxied } from '@/features/proxied-add-pure';
import { AddProxy } from '@/features/proxy-add';
import {
  type DerivationKeyDraft,
  DerivationsAddressModal,
  ExportKeysModal,
  ImportKeysModal,
  KeyConstructor,
} from '@/features/wallets';
import { ForgetWalletConfirm } from '@/features/wallets/ForgetWallet';
import { RenameWallet } from '@/features/wallets/RenameWallet';
import { walletDetailsUtils } from '../../lib/utils';
import { vaultDetailsModel } from '../../model/vault-details-model';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { walletProxiesModel } from '../../model/wallet-proxies-model';
import { WalletFiatBalance } from '../components';
import { ProxiesCount } from '../components/ProxiesCount';
import { ProxiesList } from '../components/ProxiesList';
import { ShardsList } from '../components/ShardsList';
import { Action, type WalletAction, WalletActions } from '../components/WalletActions';

export const overviewSlot = createSlot<{ walletAccounts: AnyAccount[] }>();

type Props = {
  wallet: PolkadotVaultWallet;
  onClose: () => void;
};

export const VaultWalletDetails = ({ wallet, onClose }: Props) => {
  useGate(walletDetailsModel.flow, { wallet });
  useGate(walletProxiesModel.flow, { wallet });
  const { t } = useI18n();

  const allChains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletProxiesModel.$hasWalletProxies);
  const keysToAdd = useUnit(vaultDetailsModel.$keysToAdd);
  const canCreateProxy = useUnit(walletDetailsModel.$canCreateProxy);
  const proxiesCount = useUnit(walletProxiesModel.$walletProxiesCount);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const [isRenameInputOpen, toggleIsRenameInputOpen] = useToggle();
  const [isConstructorModalOpen, toggleConstructorModal] = useToggle();
  const [isImportModalOpen, toggleImportModal] = useToggle();
  const [isScanModalOpen, toggleScanModal] = useToggle();

  const [tab, setTab] = useState('accounts');
  const [chains, setChains] = useState<Chain[]>([]);

  const walletAccounts = useStoreMap({
    store: accounts.$list,
    keys: [wallet.id],
    fn: (accounts, [walletId]) =>
      accountService
        .filterAccountsByWallet(accounts, walletId)
        .filter(a => accountUtils.isVaultChainAccount(a) || accountUtils.isVaultShardAccount(a)),
  });

  const accountsMap = useMemo(() => walletDetailsUtils.getVaultAccountsMap(walletAccounts), [walletAccounts]);

  useEffect(() => {
    const filteredChains = Object.values(allChains).filter(c => {
      return walletAccounts.some(a => accountService.isAccountAvailableOnChain(a, c));
    });

    setChains(filteredChains);
  }, [allChains, walletAccounts]);

  const handleConstructorKeys = (keys: DerivationKeyDraft[]) => {
    toggleConstructorModal();

    const draftKeySet = new Set(keys.map(k => k.chainId + k.derivationPath));
    const existingKeySet = new Set(walletAccounts.map(a => a.chainId + a.derivationPath));

    const keysToRemove = walletAccounts.filter(a => !draftKeySet.has(a.chainId + a.derivationPath));

    if (keysToRemove.length > 0) {
      vaultDetailsModel.events.keysRemoved(keysToRemove);
    }

    const keysToAdd = keys.filter(k => !existingKeySet.has(k.chainId + k.derivationPath));

    if (keysToAdd.length > 0) {
      vaultDetailsModel.events.keysAdded(keysToAdd);

      toggleScanModal();
    }
  };

  const handleImportedKeys = (keys: DerivationKeyDraft[]) => {
    toggleImportModal();

    const existingKeySet = new Set(walletAccounts.map(a => a.chainId + a.derivationPath));

    const keysToAdd = keys.filter(k => !existingKeySet.has(k.chainId + k.derivationPath));

    if (keysToAdd.length > 0) {
      vaultDetailsModel.events.keysAdded(keysToAdd);

      toggleScanModal();
    }
  };

  const handleVaultKeys = (accounts: (DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]) => {
    vaultDetailsModel.events.accountsCreated({ walletId: wallet.id, accounts });
    toggleScanModal();
  };

  const actions: WalletAction[] = [
    {
      icon: 'rename',
      title: t('walletDetails.vault.editKeys'),
      onClick: toggleConstructorModal,
    },
    {
      icon: 'import',
      title: t('walletDetails.vault.import'),
      onClick: toggleImportModal,
    },
  ];

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

  const ActionButton = (
    <ExportKeysModal wallet={wallet}>
      <IconButton name="export" />
    </ExportKeysModal>
  );

  const accountsCount = walletAccounts.length;
  const isSingleAccount = accountsCount === 1;
  const accoundId = isSingleAccount ? walletAccounts[0]?.accountId : wallet.rootAccountId;
  if (nullable(accoundId)) return null;
  const isEthereum = isEthereumAccountId(accoundId);
  const theme: IdenticonIconTheme = isEthereum ? 'ethereum' : isSingleAccount ? 'polkadot' : 'jdenticon';

  return (
    <>
      <Modal size="mdlg" height="full" isOpen={isModalOpen} onToggle={closeModal}>
        <Modal.Title close action={ActionButton}>
          {t('walletDetails.common.title')}
        </Modal.Title>
        <Modal.HeaderContent>
          <div className="mb-6 flex items-center justify-between px-5">
            <Box direction="row" verticalAlign="center" gap={2}>
              <div className="mr-1">
                <WalletAccountIcon address={toAddress(accoundId)} type={wallet.type} size={42} theme={theme} />
              </div>
              {!isRenameInputOpen && (
                <>
                  <HeadlineText className="ml-1 truncate text-text-primary" as="h3">
                    {wallet.name}
                  </HeadlineText>
                  <div className="flex shrink-0 items-center gap-3 duration-300 animate-in fade-in-0">
                    <IconButton name="rename" size={16} onClick={toggleIsRenameInputOpen} />
                    <Popover side="bottom" align="center">
                      <Popover.Trigger>
                        <IconButton name="details" />
                      </Popover.Trigger>
                      <Popover.Content>
                        <Box gap={0.5} padding={4} width="230px">
                          <FootnoteText className="text-text-tertiary">
                            {t('general.explorers.publicKeyTitle')}
                          </FootnoteText>
                          <Box direction="row" verticalAlign="center" gap={3}>
                            <HelpText className="text-text-secondary">
                              <Hash value={toAddress(wallet.rootAccountId, { prefix: 1 })} variant="full" />
                            </HelpText>
                            <Copy value={wallet.rootAccountId} notification={t('general.notifications.addressCopied')}>
                              <IconButton className="shrink-0 text-icon-default" name="copy" />
                            </Copy>
                          </Box>
                        </Box>
                      </Popover.Content>
                    </Popover>
                    <WalletFiatBalance />
                  </div>
                </>
              )}
            </Box>

            <RenameWallet wallet={wallet} isOpen={isRenameInputOpen} onClose={toggleIsRenameInputOpen} />

            {!isRenameInputOpen && (
              <div className="ml-2 shrink-0 duration-300 animate-in fade-in-0">
                <Slot id={overviewSlot} props={{ walletAccounts }} />
              </div>
            )}
          </div>

          <WalletActions actions={actions} />

          <Separator className="my-6" />
        </Modal.HeaderContent>
        <Modal.Content disableScroll>
          <Tabs value={tab} onChange={setTab}>
            <Box padding={[0, 5]} shrink={0}>
              <Tabs.List>
                <Tabs.Trigger value="accounts">
                  <span className="flex items-center gap-1">
                    {t('walletDetails.common.keyTabTitle')}
                    <span className="text-text-tertiary">{accountsCount}</span>
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
              <ScrollArea>
                <VaultAccountsList
                  className="mt-4 px-3 pb-4"
                  chains={Object.values(chains)}
                  accountsMap={accountsMap}
                  onShardClick={vaultDetailsModel.events.shardsSelected}
                />
              </ScrollArea>
            </Tabs.Content>
            <Tabs.Content value="proxies">
              <ScrollArea>
                <ProxiesList wallet={wallet} hasProxies={hasProxies} className="mt-4" canCreateProxy={canCreateProxy} />
              </ScrollArea>
            </Tabs.Content>
          </Tabs>
        </Modal.Content>
      </Modal>

      <ShardsList />

      <KeyConstructor
        isOpen={isConstructorModalOpen}
        title={wallet.name}
        existingKeys={walletAccounts}
        onConfirm={handleConstructorKeys}
        onClose={toggleConstructorModal}
      />
      <ImportKeysModal
        isOpen={isImportModalOpen}
        rootAccountId={wallet.rootAccountId}
        existingKeys={walletAccounts}
        onConfirm={handleImportedKeys}
        onClose={toggleImportModal}
      />
      <DerivationsAddressModal
        isOpen={isScanModalOpen}
        rootAccountId={wallet.rootAccountId}
        keys={keysToAdd}
        onClose={toggleScanModal}
        onComplete={handleVaultKeys}
      />
    </>
  );
};
