import { useMemo } from 'react';

import { BaseModal, ContextMenu, IconButton, HelpText } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { RootAccountLg, WalletCardLg, VaultAccountsList } from '@entities/wallet';
import { chainsService } from '@entities/network';
import { useI18n } from '@app/providers';
import type { Wallet, BaseAccount } from '@shared/core';
import { copyToClipboard } from '@shared/lib/utils';
import { VaultMap } from '../lib/types';
import { ShardsList } from './ShardsList';
import { vaultDetailsModel } from '../model/vault-details-model';
import { VaultDetailsActions } from '@widgets/WalletDetails/ui/VaultDetailsActions';

type Props = {
  wallet: Wallet;
  root: BaseAccount;
  accountsMap: VaultMap;
  onClose: () => void;
};
export const VaultWalletDetails = ({ wallet, root, accountsMap, onClose }: Props) => {
  const { t } = useI18n();

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const chains = useMemo(() => {
    return chainsService.getChainsData({ sort: true });
  }, []);

  const title = (
    <div className="flex justify-between">
      <span className="my-1">{t('walletDetails.common.title')}</span>
      <VaultDetailsActions wallet={wallet} accountsMap={accountsMap} root={root} />
    </div>
  );

  return (
    <BaseModal closeButton contentClass="" panelClass="h-modal" title={title} isOpen={isModalOpen} onClose={closeModal}>
      <div className="flex flex-col w-full">
        <div className="py-5 px-5 border-b border-divider">
          <WalletCardLg wallet={wallet} />
        </div>

        <div className="px-5 py-4">
          <ContextMenu button={<RootAccountLg name={wallet.name} accountId={root.accountId} />}>
            <ContextMenu.Group title={t('walletDetails.vault.publicKey')}>
              <div className="flex items-center gap-x-2">
                <HelpText className="text-text-secondary break-all">{root.accountId}</HelpText>
                <IconButton
                  className="shrink-0"
                  name="copy"
                  size={20}
                  onClick={() => copyToClipboard(root.accountId)}
                />
              </div>
            </ContextMenu.Group>
          </ContextMenu>
        </div>

        <VaultAccountsList
          className="h-[381px]"
          chains={chains}
          accountsMap={accountsMap}
          onShardClick={vaultDetailsModel.events.shardsSelected}
        />
      </div>

      <ShardsList />
    </BaseModal>
  );
};
