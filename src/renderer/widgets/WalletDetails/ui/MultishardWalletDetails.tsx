import { useMemo } from 'react';

import { BaseModal } from '@renderer/shared/ui';
import { useModalClose } from '@renderer/shared/lib/hooks';
import { MultishardAccountsList, WalletCardLg } from '@renderer/entities/wallet';
import { chainsService } from '@renderer/entities/network';
import { useI18n } from '@renderer/app/providers';
import type { Wallet } from '@renderer/shared/core';
import type { MultishardMap } from '../lib/types';

type Props = {
  wallet: Wallet;
  accounts: MultishardMap;
  onClose: () => void;
};
export const MultishardWalletDetails = ({ wallet, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const chains = useMemo(() => {
    return chainsService.sortChains(chainsService.getChainsData());
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
      <div className="flex flex-col w-full">
        <div className="py-5 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>
        <MultishardAccountsList accounts={accounts} chains={chains} className="h-[447px]" />
      </div>
    </BaseModal>
  );
};
