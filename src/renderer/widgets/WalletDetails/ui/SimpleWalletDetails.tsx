import { useMemo } from 'react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { AccountsList, WalletCardLg } from '@entities/wallet';
import { chainsService } from '@entities/network';
import { useI18n } from '@app/providers';
import type { Wallet, BaseAccount } from '@shared/core';

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
        <div className="py-5 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>
        <AccountsList accountId={account.accountId} chains={chains} className="h-[405px]" />
      </div>
    </BaseModal>
  );
};
