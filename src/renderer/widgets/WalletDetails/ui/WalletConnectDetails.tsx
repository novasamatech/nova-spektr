import { useMemo } from 'react';
import { useUnit } from 'effector-react';
import keyBy from 'lodash/keyBy';

import { Wallet, Chain, Account } from '@renderer/shared/core';
import { BaseModal, BodyText, StatusLabel } from '@renderer/shared/ui';
import { DEFAULT_TRANSITION } from '@renderer/shared/lib/utils';
import { useToggle } from '@renderer/shared/lib/hooks';
import { MultiAccountsList, WalletIcon } from '@renderer/entities/wallet';
import { useI18n } from '@renderer/app/providers';
import { chainsService } from '@renderer/entities/network';
import { walletProviderModel } from '../model/wallet-provider-model';

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

  const connected = useUnit(walletProviderModel.$connected);

  const closeWowModal = () => {
    toggleIsModalOpen();

    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  // TODO: Rework with https://app.clickup.com/t/8692ykm3y
  const accountsList = useMemo(() => {
    const chains = chainsService.getChainsData();
    const sortedChains = chainsService.sortChains(chains);

    const accountsMap = keyBy(accounts, 'chainId');

    const accountsList = sortedChains.reduce<AccountItem[]>((acc, chain) => {
      const accountId = accountsMap[chain.chainId]?.accountId;

      if (accountId) {
        acc.push({ accountId, chain });
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
        <div className="flex items-center justify-between gap-x-2 p-5 border-b border-divider">
          <div className="flex items-center justify-between gap-x-2">
            <WalletIcon type={wallet.type} size={32} />
            <BodyText>{wallet.name}</BodyText>
          </div>
          <StatusLabel
            variant={connected ? 'success' : 'waiting'}
            title={t(
              connected
                ? 'walletDetails.walletConnect.connectedStatus'
                : 'walletDetails.walletConnect.disconnectedStatus',
            )}
          />
        </div>

        <div className="px-3">
          <MultiAccountsList accounts={accountsList} className="h-[450px]" />
        </div>
      </div>
    </BaseModal>
  );
};
