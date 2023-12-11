import { useUnit } from 'effector-react';

import { BaseModal, DropdownIconButton } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { MultishardAccountsList, WalletCardLg } from '@entities/wallet';
import { networkModel } from '@entities/network';
import { useI18n } from '@app/providers';
import type { Wallet } from '@shared/core';
import type { MultishardMap } from '../lib/types';
import { walletDetailsUtils } from '../lib/utils';
import { IconNames } from '@shared/ui/Icon/data';

type Props = {
  wallet: Wallet;
  accounts: MultishardMap;
  onClose: () => void;
};
export const MultishardWalletDetails = ({ wallet, accounts, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const chains = useUnit(networkModel.$chains);

  const Options = [
    {
      icon: 'export' as IconNames,
      title: t('walletDetails.vault.export'),
      onClick: () => walletDetailsUtils.exportMultishardWallet(wallet, accounts),
    },
  ];

  const ActionButton = (
    <DropdownIconButton name="more">
      <DropdownIconButton.Items>
        {Options.map((option) => (
          <DropdownIconButton.Item key={option.icon}>
            <DropdownIconButton.Option option={option} />
          </DropdownIconButton.Item>
        ))}
      </DropdownIconButton.Items>
    </DropdownIconButton>
  );

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="h-modal"
      title={t('walletDetails.common.title')}
      actionButton={ActionButton}
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <div className="flex flex-col w-full">
        <div className="py-6 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>
        <MultishardAccountsList accounts={accounts} chains={Object.values(chains)} className="h-[443px]" />
      </div>
    </BaseModal>
  );
};
