import { useMemo } from 'react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { MultishardAccountsList, WalletCardLg } from '@entities/wallet';
import { chainsService } from '@entities/network';
import { useI18n } from '@app/providers';
import type { Wallet } from '@shared/core';
import type { MultishardMap } from '../lib/types';
import { MultishardDetailsActions } from './MultishardDetailsActions';

type Props = {
  wallet: Wallet;
  accounts: MultishardMap;
  onClose: () => void;
};
export const MultishardWalletDetails = ({ wallet, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const chains = useMemo(() => {
    return chainsService.getChainsData({ sort: true });
  }, []);

  const title = (
    <div className="flex justify-between">
      <span>{t('walletDetails.common.title')}</span>
      <MultishardDetailsActions wallet={wallet} accounts={accounts} />
    </div>
  );

  return (
    <BaseModal closeButton contentClass="" panelClass="h-modal" title={title} isOpen={isModalOpen} onClose={closeModal}>
      <div className="flex flex-col w-full">
        <div className="py-5 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>
        <MultishardAccountsList accounts={accounts} chains={chains} className="h-[447px]" />
      </div>
    </BaseModal>
  );
};
