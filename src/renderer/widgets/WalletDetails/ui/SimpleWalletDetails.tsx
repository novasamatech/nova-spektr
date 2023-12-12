import { useMemo } from 'react';

import { BaseModal, DropdownIconButton } from '@shared/ui';
import { useModalClose, useToggle } from '@shared/lib/hooks';
import { AccountsList, WalletCardLg } from '@entities/wallet';
import { chainsService } from '@entities/network';
import { useI18n } from '@app/providers';
import type { Wallet, BaseAccount } from '@shared/core';
import { IconNames } from '@shared/ui/Icon/data';
import { RenameWalletModal } from './WalletActions/RenameWalletModal';

type Props = {
  wallet: Wallet;
  account: BaseAccount;
  onClose: () => void;
};
export const SimpleWalletDetails = ({ wallet, account, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();

  const chains = useMemo(() => {
    return chainsService.getChainsData({ sort: true });
  }, []);

  const Options = [
    {
      icon: 'rename' as IconNames,
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
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
      <div className="flex flex-col gap-y-4 w-full">
        <div className="py-6 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>
        <AccountsList accountId={account.accountId} chains={chains} className="h-[401px]" />
      </div>

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />
    </BaseModal>
  );
};
