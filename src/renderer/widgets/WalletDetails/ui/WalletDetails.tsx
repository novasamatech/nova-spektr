import { Wallet, Account } from '@renderer/shared/core';
import { BaseModal } from '@renderer/shared/ui';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';

type Props = {
  isOpen: boolean;
  wallet: Wallet;
  accounts: Account[];
  onClose: () => void;
};
export const WalletDetails = ({ isOpen, wallet, accounts, onClose }: Props) => {
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
      <div className="flex flex-col gap-y-2">
        <h2>{wallet.name}</h2>
        <ul>
          {accounts.map((account) => (
            <li key={account.id}>{account.accountId}</li>
          ))}
        </ul>
      </div>
    </BaseModal>
  );
};
