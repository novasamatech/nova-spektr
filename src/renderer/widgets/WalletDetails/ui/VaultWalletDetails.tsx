import { useUnit } from 'effector-react';
import { useState } from 'react';

import { BaseModal, ContextMenu, IconButton, HelpText, DropdownIconButton } from '@shared/ui';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { RootAccountLg, WalletCardLg, VaultAccountsList } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { useI18n } from '@app/providers';
import { Wallet, BaseAccount, ChainAccount, ShardAccount, DraftAccount, KeyType, Account } from '@shared/core';
import { copyToClipboard, toAddress } from '@shared/lib/utils';
import { IconNames } from '@shared/ui/Icon/data';
import { VaultMap } from '../lib/types';
import { ShardsList } from './ShardsList';
import { vaultDetailsModel } from '../model/vault-details-model';
import { walletDetailsUtils } from '../lib/utils';
import { KeyConstructor, ImportKeysModal, DerivationsAddressModal } from '@features/wallets';
import { RenameWalletModal } from '@features/wallets/RenameWallet';
import { ForgetWalletModal } from '@features/wallets/ForgetWallet';

type Props = {
  wallet: Wallet;
  root: BaseAccount;
  accountsMap: VaultMap;
  onClose: () => void;
};
export const VaultWalletDetails = ({ wallet, root, accountsMap, onClose }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [newKeys, setNewKeys] = useState<DraftAccount<ChainAccount>[]>([]);

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

      setNewKeys([...mainAccounts, ...keysToAdd.flat()]);
      toggleScanModal();
    }
  };

  const handleImportedKeys = (keys: DraftAccount<ChainAccount | ShardAccount>[]) => {
    toggleImportModal();
    const newKeys = keys.filter((key) => {
      return key.keyType === KeyType.MAIN || !(key as Account).accountId;
    });

    setNewKeys(newKeys);
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

        <div className="px-5 py-4">
          <ContextMenu button={<RootAccountLg name={wallet.name} accountId={root.accountId} />}>
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
        </div>

        <VaultAccountsList
          className="h-[377px]"
          chains={Object.values(chains)}
          accountsMap={accountsMap}
          onShardClick={vaultDetailsModel.events.shardsSelected}
        />
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
        keys={newKeys}
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
