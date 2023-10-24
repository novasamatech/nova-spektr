import { useMemo } from 'react';

import { BaseModal, BodyText } from '@renderer/shared/ui';
import { useModalClose } from '@renderer/shared/lib/hooks';
import { AccountsList, WalletIcon } from '@renderer/entities/wallet';
import { chainsService } from '@renderer/entities/network';
import { useI18n } from '@renderer/app/providers';
import type { Wallet, BaseAccount } from '@renderer/shared/core';

type Props = {
  wallet: Wallet;
  account: BaseAccount;
  onClose: () => void;
};
export const SimpleWalletDetails = ({ wallet, account, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const chains = useMemo(() => {
    const chains = chainsService.getChainsData();

    return chainsService.sortChains(chains);
  }, []);

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="h-modal"
      title={t('walletDetails.common.title')}
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <div className="flex flex-col gap-y-4 w-full">
        <div className="flex items-center gap-x-2 py-5 px-5 border-b border-divider">
          <WalletIcon type={wallet.type} size={32} />
          <BodyText>{wallet.name}</BodyText>
        </div>
        <AccountsList accountId={account.accountId} chains={chains} className="h-[415px]" />
      </div>
    </BaseModal>
  );
};
