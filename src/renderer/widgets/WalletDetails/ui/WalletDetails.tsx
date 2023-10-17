import { Wallet } from '@renderer/shared/core';
import { BaseModal } from '@renderer/shared/ui';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';

type Props = {
  wallet: Wallet;
  isOpen: boolean;
  onClose: () => void;
};
export const WalletDetails = ({ wallet, isOpen, onClose }: Props) => {
  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);

  const closeWowModal = () => {
    toggleIsModalOpen();

    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  return (
    <BaseModal
      closeButton
      contentClass="flex h-full"
      panelClass="w-modal h-modal"
      isOpen={isModalOpen}
      onClose={closeWowModal}
    >
      {wallet.name}
    </BaseModal>
  );
};
