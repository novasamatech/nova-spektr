import { useMemo } from 'react';

import { BaseModal, DropdownIconButton, Icon, FootnoteText } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { MultishardAccountsList, WalletCardLg } from '@entities/wallet';
import { chainsService } from '@entities/network';
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

  const chains = useMemo(() => {
    return chainsService.getChainsData({ sort: true });
  }, []);

  const Options = [
    {
      icon: 'export',
      title: t('walletDetails.vault.export'),
      onClick: () => walletDetailsUtils.exportMultishardWallet(wallet, accounts),
    },
  ];

  const ActionButton = (
    <DropdownIconButton>
      <DropdownIconButton.Button className="m-1.5" name="more" />
      <DropdownIconButton.Items>
        {Options.map((option) => (
          <DropdownIconButton.Item key={option.icon}>
            <button className="flex items-center gap-x-1.5 w-full p-2" onClick={option.onClick}>
              <Icon name={option.icon as IconNames} size={20} className="text-icon-accent" />
              <FootnoteText className="text-text-secondary">{option.title}</FootnoteText>
            </button>
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
        <MultishardAccountsList accounts={accounts} chains={chains} className="h-[443px]" />
      </div>
    </BaseModal>
  );
};
