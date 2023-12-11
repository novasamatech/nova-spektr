import { DropdownIconButton } from '@shared/ui';
import { Wallet } from '@shared/core';
import { useI18n } from '@app/providers';
import { useToggle } from '@shared/lib/hooks';
import { RenameWalletModal } from './actions/RenameWalletModal';
import { DropdownIconButtonOption } from '@shared/ui/Dropdowns/common/types';
import { IconNames } from '@shared/ui/Icon/data';

type Props = {
  wallet: Wallet;
  extraActions?: DropdownIconButtonOption[];
};

export const GeneralWalletActions = ({ wallet, extraActions }: Props) => {
  const { t } = useI18n();
  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();

  const generalActions = [
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

  const options = extraActions ? [...generalActions, ...extraActions] : generalActions;

  return (
    <>
      <DropdownIconButton name="more">
        <DropdownIconButton.Items>
          {options.map((option) => (
            <DropdownIconButton.Item key={option.icon}>
              <DropdownIconButton.Option option={option} />
            </DropdownIconButton.Item>
          ))}
        </DropdownIconButton.Items>
      </DropdownIconButton>
      {/*<DropdownIconButton className="m-1.5" name="more" options={options} optionsClassName="right-0" />*/}
      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />
    </>
  );
};
