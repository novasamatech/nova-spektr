import { useUnit } from 'effector-react';

import { BaseModal, IconButton, HelpText } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { ExplorersPopover, AccountAddress, accountUtils } from '@entities/wallet';
import { vaultDetailsModel } from '../../model/vault-details-model';
import { cnTw } from '@shared/lib/utils';
import { useI18n } from '@app/providers';

export const ShardsList = () => {
  const { t } = useI18n();

  const shards = useUnit(vaultDetailsModel.$shards);
  const chain = useUnit(vaultDetailsModel.$chain);

  const [isModalOpen, closeModal] = useModalClose(shards.length > 0, vaultDetailsModel.events.shardsCleared);

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="h-modal"
      title={t('walletDetails.vault.shardsTitle')}
      isOpen={isModalOpen}
      onClose={closeModal}
    >
      <ul className="flex flex-col gap-y-2 overflow-y-auto max-h-[530px]">
        {shards.map((shard) => (
          <li key={shard.accountId} className="px-3">
            <ExplorersPopover
              button={
                // TODO: use special Address component when it comes out similar to WalletCardMd
                <div
                  className={cnTw(
                    'group flex items-center justify-between gap-x-1 w-full px-2 py-1.5 rounded transition-colors cursor-pointer',
                    'hover:bg-action-background-hover focus-within:bg-action-background-hover',
                  )}
                >
                  <AccountAddress
                    className="w-[370px]"
                    size={20}
                    type="adaptive"
                    accountId={shard.accountId}
                    addressPrefix={chain.addressPrefix}
                  />
                  <IconButton
                    name="info"
                    className={cnTw(
                      'shrink-0 opacity-0 transition-opacity',
                      'group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100',
                    )}
                  />
                </div>
              }
              address={shard.accountId}
              addressPrefix={chain.addressPrefix}
              explorers={chain.explorers || []}
            >
              <ExplorersPopover.Group title={t('general.explorers.derivationTitle')}>
                <HelpText className="text-text-secondary break-all">{accountUtils.getDerivationPath(shard)}</HelpText>
              </ExplorersPopover.Group>
            </ExplorersPopover>
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};
