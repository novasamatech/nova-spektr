import { useMemo } from 'react';

import { BaseModal, DropdownIconButton } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { MultishardAccountsList, WalletCardLg } from '@entities/wallet';
import { chainsService } from '@entities/network';
import { useI18n } from '@app/providers';
import type { Wallet } from '@shared/core';
import type { MultishardMap } from '../lib/types';
import { walletDetailsUtils } from '../lib/utils';

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

  const options = [
    {
      id: 'export',
      icon: 'export',
      title: t('walletDetails.vault.export'),
      onClick: () => walletDetailsUtils.exportMultishardWallet(wallet, accounts),
    },
  ];

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="h-modal"
      title={t('walletDetails.common.title')}
      actionButton={<DropdownIconButton className="m-1.5" name="more" options={options} optionsClassName="right-0" />}
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <div className="flex flex-col w-full">
        <div className="py-6 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>
        <MultishardAccountsList accounts={accounts} chains={chains} className="h-[443px]" />
      </div>
    </BaseModal>
  );
};
