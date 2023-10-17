import { useMemo } from 'react';

import { Wallet, Account } from '@renderer/shared/core';
import { BaseModal, BodyText } from '@renderer/shared/ui';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';
import { AccountsList, WalletIcon } from '@renderer/entities/wallet';
import { chainsService } from '@renderer/entities/network';
import { useI18n } from '@renderer/app/providers';

type Props = {
  isOpen: boolean;
  wallet: Wallet;
  account: Account;
  onClose: () => void;
};
export const SimpleWalletDetails = ({ isOpen, wallet, account, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);

  const chains = useMemo(() => {
    const chains = chainsService.getChainsData();

    return chainsService.sortChains(chains);
  }, []);

  const closeWowModal = () => {
    toggleIsModalOpen();

    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  return (
    <BaseModal
      closeButton
      contentClass=""
      title={t('walletDetails.simpleTitle')}
      isOpen={isModalOpen}
      onClose={closeWowModal}
    >
      <div className="flex flex-col w-full">
        <div className="flex items-center gap-x-2 py-5 px-5 border-b border-divider">
          <WalletIcon type={wallet.type} size={32} />
          <BodyText>{wallet.name}</BodyText>
        </div>
        <AccountsList accountId={account.accountId} chains={chains} className="h-[450px]" />
      </div>
    </BaseModal>
  );
};
