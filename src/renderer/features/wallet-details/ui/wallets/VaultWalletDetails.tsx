import { useGate, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

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
import { copyToClipboard, toAddress } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Icon, IconButton } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/Icon/data';
import { Hash } from '@/shared/ui-entities';
import { Box, Dropdown, Modal, Popover, ScrollArea, Tabs } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { RootAccountLg, VaultAccountsList, WalletCardLg, accountUtils, permissionUtils } from '@/entities/wallet';
import { proxyAddFeature } from '@/features/proxy-add';
import { proxyAddPureFeature } from '@/features/proxy-add-pure';
import { DerivationsAddressModal, ExportKeysModal, ImportKeysModal, KeyConstructor } from '@/features/wallets';
import { ForgetWalletModal } from '@/features/wallets/ForgetWallet';
import { RenameWalletModal } from '@/features/wallets/RenameWallet';
import { walletDetailsUtils } from '../../lib/utils';
import { vaultDetailsModel } from '../../model/vault-details-model';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { ProxiesList } from '../components/ProxiesList';
import { ShardsList } from '../components/ShardsList';

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

  const accountsMap = walletDetailsUtils.getVaultAccountsMap(wallet.accounts);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConstructorModalOpen, toggleConstructorModal] = useToggle();
  const [isImportModalOpen, toggleImportModal] = useToggle();
  const [isExportModalOpen, toggleExportModal] = useToggle();
  const [isScanModalOpen, toggleScanModal] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

  const [tab, setTab] = useState('accounts');
  const [chains, setChains] = useState<Chain[]>([]);

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

  const options = [
    {
      icon: 'rename' as IconNames,
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
    },
    {
      icon: 'editKeys' as IconNames,
      title: t('walletDetails.vault.editKeys'),
      onClick: toggleConstructorModal,
    },
    {
      icon: 'import' as IconNames,
      title: t('walletDetails.vault.import'),
      onClick: toggleImportModal,
    },
    {
      icon: 'export' as IconNames,
      title: t('walletDetails.vault.export'),
      onClick: toggleExportModal,
    },
    {
      icon: 'forget' as IconNames,
      title: t('walletDetails.common.forgetButton'),
      onClick: toggleConfirmForget,
    },
  ];

  if (permissionUtils.canCreateAnyProxy(wallet) || permissionUtils.canCreateNonAnyProxy(wallet)) {
    options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxy.events.flowStarted,
    });
  }

  if (permissionUtils.canCreateAnyProxy(wallet)) {
    options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addPureProxiedAction'),
      onClick: addPureProxied.events.flowStarted,
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

  return (
    <>
      <Modal size="md" height="lg" isOpen={isModalOpen} onToggle={closeModal}>
        <Modal.Title close action={ActionButton}>
          {t('walletDetails.common.title')}
        </Modal.Title>
        <Modal.HeaderContent>
          <div className="mb-4 flex items-center justify-between border-b border-divider px-5 pb-6 pt-4">
            <WalletCardLg wallet={wallet} />

            <div className="shrink-0">
              <Slot id={overviewSlot} props={{ walletAccounts: wallet.accounts }} />
            </div>
          </div>
        </Modal.HeaderContent>
        <Modal.Content disableScroll>
          <Tabs value={tab} onChange={setTab}>
            <Box padding={[0, 5]} shrink={0}>
              <Tabs.List>
                <Tabs.Trigger value="accounts">{t('walletDetails.common.accountTabTitle')}</Tabs.Trigger>
                <Tabs.Trigger value="proxies">{t('walletDetails.common.proxiesTabTitle')}</Tabs.Trigger>
              </Tabs.List>
            </Box>
            <Tabs.Content value="accounts">
              <ScrollArea>
                <RootAccountLg name={wallet.name} accountId={wallet.rootAccountId} className="mt-3 px-5">
                  <Popover side="bottom" align="end">
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
                </RootAccountLg>

                <VaultAccountsList
                  className="mt-4 px-5 pb-4"
                  chains={Object.values(chains)}
                  accountsMap={accountsMap}
                  onShardClick={vaultDetailsModel.events.shardsSelected}
                />
              </ScrollArea>
            </Tabs.Content>
            <Tabs.Content value="proxies">
              <ScrollArea>
                {hasProxies ? (
                  <ProxiesList className="mt-4" wallet={wallet} canCreateProxy={canCreateProxy} />
                ) : (
                  <NoProxiesAction
                    className="mt-4 h-[371px]"
                    canCreateProxy={canCreateProxy}
                    onAddProxy={addProxy.events.flowStarted}
                  />
                )}
              </ScrollArea>
            </Tabs.Content>
          </Tabs>
        </Modal.Content>
      </Modal>

      <ShardsList />

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />
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
