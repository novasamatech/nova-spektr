import { useMemo } from 'react';

import { Wallet, Chain, Account, WalletConnectAccount } from '@renderer/shared/core';
import { BaseModal, BodyText } from '@renderer/shared/ui';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';
import { MultiAccountsList, WalletIcon } from '@renderer/entities/wallet';
import { useI18n } from '@renderer/app/providers';
import { chainsService } from '@renderer/entities/network';

type AccountItem = {
  accountId: `0x${string}`;
  chain: Chain;
};

type Props = {
  isOpen: boolean;
  wallet: Wallet;
  accounts: Account[];
  onClose: () => void;
};
export const WalletConnectDetails = ({ isOpen, wallet, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, toggleIsModalOpen] = useToggle(isOpen);

  const closeWowModal = () => {
    toggleIsModalOpen();

    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  const accountsList = useMemo(() => {
    const chains = chainsService.getChainsData();
    const sortedChains = chainsService.sortChains(chains);

    const accountsList = sortedChains.reduce<AccountItem[]>((acc, c) => {
      const account = accounts.find((a) => c.chainId === (a as WalletConnectAccount).chainId);

      if (account) {
        acc.push({
          accountId: account.accountId,
          chain: c,
        });
      }

      return acc;
    }, []);

    return accountsList;
  }, []);

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

        <div className="px-3">
          <MultiAccountsList accounts={accountsList} className="h-[450px]" />
        </div>
      </div>
    </BaseModal>
  );
};
