import { useUnit } from 'effector-react';

import { BaseModal, ContextMenu, DropdownIconButton, HelpText, IconButton, Tabs } from '@shared/ui';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { RootAccountLg, VaultAccountsList, WalletCardLg } from '@entities/wallet';
import { useI18n } from '@app/providers';
import { Account, BaseAccount, ChainAccount, DraftAccount, KeyType, ShardAccount, Wallet } from '@shared/core';
import { copyToClipboard, toAddress } from '@shared/lib/utils';
import { IconNames } from '@shared/ui/Icon/data';
import { VaultMap } from '../../lib/types';
import { ShardsList } from '../components/ShardsList';
import { vaultDetailsModel } from '../../model/vault-details-model';
import { walletDetailsUtils } from '../../lib/utils';
import { DerivationsAddressModal, ImportKeysModal, KeyConstructor } from '@features/wallets';
import { RenameWalletModal } from '@features/wallets/RenameWallet';
import { ForgetWalletModal } from '@features/wallets/ForgetWallet';
import { TabItem } from '@shared/ui/Tabs/common/types';
import { ProxiesList } from '../components/ProxiesList';
import { walletProviderModel } from '../../model/wallet-provider-model';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { networkModel } from '@entities/network';

type Props = {
  wallet: Wallet;
  root: BaseAccount;
  accountsMap: VaultMap;
  onClose: () => void;
};
export const VaultWalletDetails = ({ wallet, root, accountsMap, onClose }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(walletProviderModel.$hasProxies);
  const keysToAdd = useUnit(vaultDetailsModel.$keysToAdd);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConstructorModalOpen, toggleConstructorModal] = useToggle();
  const [isImportModalOpen, toggleImportModal] = useToggle();
  const [isScanModalOpen, toggleScanModal] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();

  const handleConstructorKeys = (
    keysToAdd: Array<ChainAccount | ShardAccount[]>,
    keysToRemove: Array<ChainAccount | ShardAccount[]>,
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

  const handleImportedKeys = (keys: DraftAccount<ChainAccount | ShardAccount>[]) => {
    toggleImportModal();
    const newKeys = keys.filter((key) => {
      return key.keyType === KeyType.MAIN || !(key as Account).accountId;
    });

    vaultDetailsModel.events.keysAdded(newKeys);
    toggleScanModal();
  };

  const handleVaultKeys = (accounts: DraftAccount<ChainAccount | ShardAccount>[]) => {
    vaultDetailsModel.events.accountsCreated({
      walletId: wallet.id,
      rootAccountId: root.accountId,
      accounts,
    });
    toggleScanModal();
  };

  const Options = [
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
      onClick: () => walletDetailsUtils.exportVaultWallet(wallet, root, accountsMap),
    },
    {
      icon: 'forget' as IconNames,
      title: t('walletDetails.common.forgetButton'),
      onClick: toggleConfirmForget,
    },
  ];

  const ActionButton = (
    <DropdownIconButton name="more">
      <DropdownIconButton.Items>
        {Options.map((option) => (
          <DropdownIconButton.Item key={option.icon}>
            <DropdownIconButton.Option option={option} />
          </DropdownIconButton.Item>
        ))}
      </DropdownIconButton.Items>
    </DropdownIconButton>
  );

  const tabItems: TabItem[] = [
    {
      id: 'accounts',
      title: t('walletDetails.common.accountTabTitle'),
      panel: (
        <div className="pt-4">
          <ContextMenu button={<RootAccountLg name={wallet.name} accountId={root.accountId} className="px-5" />}>
            <ContextMenu.Group title={t('general.explorers.publicKeyTitle')}>
              <div className="flex items-center gap-x-2">
                <HelpText className="text-text-secondary break-all">
                  {toAddress(root.accountId, { prefix: 1 })}
                </HelpText>
                <IconButton
                  className="shrink-0"
                  name="copy"
                  size={20}
                  onClick={() => copyToClipboard(root.accountId)}
                />
              </div>
            </ContextMenu.Group>
          </ContextMenu>

          <VaultAccountsList
            className="h-[354px] mt-4 pb-4 px-5"
            chains={Object.values(chains)}
            accountsMap={accountsMap}
            onShardClick={vaultDetailsModel.events.shardsSelected}
          />
        </div>
      ),
    },
    {
      id: 'proxies',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: hasProxies ? (
        <ProxiesList walletId={wallet.id} className="h-[403px] mt-4" />
      ) : (
        <NoProxiesAction className="h-[403px] mt-4" />
      ),
    },
  ];

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="h-modal"
      title={t('walletDetails.common.title')}
      actionButton={ActionButton}
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <div className="flex flex-col w-full">
        <div className="py-6 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>

        <Tabs items={tabItems} panelClassName="" tabsClassName="mx-5" unmount={false} />
      </div>

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
        rootAccountId={root.accountId}
        existingKeys={Object.values(accountsMap).flat(2)}
        onConfirm={handleImportedKeys}
        onClose={toggleImportModal}
      />
      <DerivationsAddressModal
        isOpen={isScanModalOpen}
        rootAccountId={root.accountId}
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
    </BaseModal>
  );
};
