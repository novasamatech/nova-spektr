import { useMemo } from 'react';

import { BaseModal, ContextMenu, IconButton, HelpText, DropdownIconButton } from '@shared/ui';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { RootAccountLg, WalletCardLg, VaultAccountsList } from '@entities/wallet';
import { chainsService } from '@entities/network';
import { useI18n } from '@app/providers';
import type { Wallet, BaseAccount } from '@shared/core';
import { copyToClipboard, toAddress } from '@shared/lib/utils';
import { IconNames } from '@shared/ui/Icon/data';
import { VaultMap } from '../lib/types';
import { ShardsList } from './ShardsList';
import { vaultDetailsModel } from '../model/vault-details-model';
import { walletDetailsUtils } from '../lib/utils';
import { RenameWalletModal } from './WalletActions/RenameWalletModal';

type Props = {
  wallet: Wallet;
  root: BaseAccount;
  accountsMap: VaultMap;
  onClose: () => void;
};
export const VaultWalletDetails = ({ wallet, root, accountsMap, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  console.log('isRenameModalOpen', isRenameModalOpen);

  const chains = useMemo(() => {
    return chainsService.getChainsData({ sort: true });
  }, []);

  const Options = [
    {
      icon: 'rename' as IconNames,
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
    },
    {
      icon: 'export' as IconNames,
      title: t('walletDetails.vault.export'),
      onClick: () => walletDetailsUtils.exportVaultWallet(wallet, root, accountsMap),
    },
    // {
    //   icon: 'forget',
    //   title: t('walletDetails.common.forgetButton'),
    //   onClick: () => {},
    // },
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
            <ContextMenu.Group title={t('walletDetails.vault.publicKey')}>
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
          chains={chains}
          accountsMap={accountsMap}
          onShardClick={vaultDetailsModel.events.shardsSelected}
        />
      </div>

      <ShardsList />

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />
    </BaseModal>
  );
};
