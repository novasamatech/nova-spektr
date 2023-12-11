import { DropdownIconButton } from '@shared/ui';
import { Wallet } from '@shared/core';
import { IconButtonDropdownOption } from '@shared/ui/Dropdowns/DropdownIconButton/DropdownIconButton';
import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { RenameWalletModal } from './actions/RenameWalletModal';

type Props = {
  wallet: Wallet;
  extraActions?: IconButtonDropdownOption[];
};

export const GeneralWalletActions = ({ wallet, extraActions }: Props) => {
  const { t } = useI18n();
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();

  const generalActions = [
    {
      id: 'rename',
      icon: 'rename',
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
    },
    // {
    //   id: 'forget',
    //   icon: 'forget',
    //   title: t('walletDetails.common.forgetButton'),
    //   onClick: () => {},
    // },
  ];

  const options = extraActions ? [...generalActions, ...extraActions] : generalActions;

  return (
    <>
      <DropdownIconButton className="m-1.5" name="more" options={options} optionsClassName="right-0" />
      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />
    </>
  );
};
