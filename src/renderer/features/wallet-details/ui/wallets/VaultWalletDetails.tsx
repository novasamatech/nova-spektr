import { useGate, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import {
  type Chain,
  type DraftAccount,
  type PolkadotVaultWallet,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { KeyType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { copyToClipboard, isEthereumAccountId, nullable, toAddress } from '@/shared/lib/utils';
import { FootnoteText, HeadlineText, HelpText, IconButton, type IconTheme, Separator } from '@/shared/ui';
import { Hash, WalletAccountIcon } from '@/shared/ui-entities';
import { Box, Modal, Popover, ScrollArea, Tabs } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { VaultAccountsList, accountUtils, permissionUtils } from '@/entities/wallet';
import { proxyAddFeature } from '@/features/proxy-add';
import { proxyAddPureFeature } from '@/features/proxy-add-pure';
import { DerivationsAddressModal, ExportKeysModal, ImportKeysModal, KeyConstructor } from '@/features/wallets';
import { ForgetWalletModal } from '@/features/wallets/ForgetWallet';
import { RenameWallet } from '@/features/wallets/RenameWallet';
import { walletDetailsUtils } from '../../lib/utils';
import { vaultDetailsModel } from '../../model/vault-details-model';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { WalletFiatBalance } from '../components';
import { ProxiesList } from '../components/ProxiesList';
import { ShardsList } from '../components/ShardsList';
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
  wallet: PolkadotVaultWallet;
  onClose: () => void;
};
export const VaultWalletDetails = ({ wallet, onClose }: Props) => {
  useGate(walletDetailsModel.flow, { wallet });
  const { t } = useI18n();

  const allChains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletDetailsModel.$hasProxies);
  const keysToAdd = useUnit(vaultDetailsModel.$keysToAdd);
  const canCreateProxy = useUnit(walletDetailsModel.$canCreateProxy);
  const proxiesCount = useUnit(walletDetailsModel.$proxiesCount);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConstructorModalOpen, toggleConstructorModal] = useToggle();
  const [isImportModalOpen, toggleImportModal] = useToggle();
  const [isExportModalOpen, toggleExportModal] = useToggle();
  const [isScanModalOpen, toggleScanModal] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

  const [tab, setTab] = useState('accounts');
  const [chains, setChains] = useState<Chain[]>([]);

  const accountsMap = useMemo(() => {
    const accountsMap = walletDetailsUtils.getVaultAccountsMap(wallet.accounts);
    //todo sort these accounts

    return accountsMap;
  }, [wallet.accounts]);

  useEffect(() => {
    const filteredChains = Object.values(allChains).filter(c => {
      const accounts = Object.values(accountsMap).flat(2);

      return accounts.some(a => accountUtils.isChainAndCryptoMatch(a, c));
    });

    setChains(filteredChains);
  }, []);

  const handleConstructorKeys = (
    keysToAdd: (VaultChainAccount | VaultShardAccount[])[],
    keysToRemove: (VaultChainAccount | VaultShardAccount[])[],
  ) => {
    toggleConstructorModal();

    if (keysToRemove.length > 0) {
      vaultDetailsModel.events.keysRemoved(keysToRemove.flat());
    }

    if (keysToAdd.length > 0) {
      const vaultAccounts = Object.values(accountsMap).flat();
      const mainAccounts = walletDetailsUtils.getMainAccounts(vaultAccounts);

      vaultDetailsModel.events.keysAdded([...mainAccounts, ...keysToAdd.flat()]);
      toggleScanModal();
    }
  };

  const handleImportedKeys = (keys: (DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]) => {
    toggleImportModal();
    const newKeys = keys.filter(key => {
      return key.keyType === KeyType.MAIN || !(key as VaultChainAccount | VaultShardAccount).accountId;
    });

    vaultDetailsModel.events.keysAdded(newKeys);
    toggleScanModal();
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
    iconClassName: 'text-icon-negative',
    backgroundClassName: 'bg-secondary-negative-button-background',
    onClick: toggleConfirmForget,
  });

  const ActionButton = <IconButton name="export" onClick={toggleExportModal} />;

  const accountsCount = Object.values(accountsMap).flat(2).length;

  const isSingleAccount = wallet.accounts.length === 1;
  const address = isSingleAccount ? wallet.accounts[0]?.accountId : wallet.rootAccountId;
  if (nullable(address)) return null;
  const isEthereum = isEthereumAccountId(address);
  const theme: IconTheme = isEthereum ? 'ethereum' : isSingleAccount ? 'polkadot' : 'jdenticon';

  return (
    <>
      <Modal size="mdlg" height="full" isOpen={isModalOpen} onToggle={closeModal}>
        <Modal.Title close action={ActionButton}>
          {t('walletDetails.common.title')}
        </Modal.Title>
        <Modal.HeaderContent>
          <div className="mb-6 flex items-center justify-between px-5">
            <Box direction="row" verticalAlign="center" gap={3}>
              <div className="mr-1">
                <WalletAccountIcon address={address} type={wallet.type} size={42} theme={theme} />
              </div>
              {!isRenameModalOpen && (
                <>
                  <HeadlineText className="truncate text-text-primary" as="h3">
                    {wallet.name}
                  </HeadlineText>
                  <div className="flex shrink-0 items-center gap-3 duration-300 animate-in fade-in-0">
                    <IconButton name="rename" size={16} onClick={toggleIsRenameModalOpen} />
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
                            <IconButton
                              className="shrink-0 text-icon-default"
                              name="copy"
                              onClick={() => copyToClipboard(wallet.rootAccountId)}
                            />
                          </Box>
                        </Box>
                      </Popover.Content>
                    </Popover>
                    <WalletFiatBalance />
                  </div>
                </>
              )}
            </Box>

            <RenameWallet wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

            {!isRenameModalOpen && (
              <div className="ml-2 shrink-0 duration-300 animate-in fade-in-0">
                <Slot id={overviewSlot} props={{ walletAccounts: wallet.accounts }} />
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
                    {t('walletDetails.common.accountTabTitle')}
                    <span className="text-text-tertiary">{accountsCount}</span>
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
                <ProxiesList
                  wallet={wallet}
                  hasProxies={hasProxies}
                  className="mt-4 h-[371px]"
                  canCreateProxy={canCreateProxy}
                  onAddProxy={addProxy.events.flowStarted}
                />
              </ScrollArea>
            </Tabs.Content>
          </Tabs>
        </Modal.Content>
      </Modal>

      <ShardsList />

      <KeyConstructor
        isOpen={isConstructorModalOpen}
        title={wallet.name}
        existingKeys={Object.values(accountsMap).flat(2)}
        onConfirm={handleConstructorKeys}
        onClose={toggleConstructorModal}
      />
      <ImportKeysModal
        isOpen={isImportModalOpen}
        rootAccountId={wallet.rootAccountId}
        existingKeys={Object.values(accountsMap).flat(2)}
        onConfirm={handleImportedKeys}
        onClose={toggleImportModal}
      />
      <ExportKeysModal
        isOpen={isExportModalOpen}
        wallet={wallet}
        accounts={Object.values(accountsMap).flat()}
        onClose={toggleExportModal}
      />
      <DerivationsAddressModal
        isOpen={isScanModalOpen}
        rootAccountId={wallet.rootAccountId}
        keys={keysToAdd}
        onClose={toggleScanModal}
        onComplete={handleVaultKeys}
      />

      <ForgetWalletModal
        wallet={wallet}
        isOpen={isConfirmForgetOpen}
        onClose={toggleConfirmForget}
        onForget={onClose}
      />

      <AddProxy wallet={wallet} />
      <AddPureProxied wallet={wallet} />
    </>
  );
};
