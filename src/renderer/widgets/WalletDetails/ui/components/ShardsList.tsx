import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { cnTw } from '@/shared/lib/utils';
import { BaseModal, HelpText, IconButton } from '@/shared/ui';
import { AccountAddress, ExplorersPopover, accountUtils } from '@/entities/wallet';
import { vaultDetailsModel } from '../../model/vault-details-model';

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
      <ul className="flex max-h-[530px] flex-col gap-y-2 overflow-y-auto">
        {shards.map((shard) => (
          <li key={shard.accountId} className="px-3">
            <ExplorersPopover
              button={
                // TODO: use special Address component when it comes out similar to WalletCardMd
                <div
                  className={cnTw(
                    'group flex w-full cursor-pointer items-center justify-between gap-x-1 rounded px-2 py-1.5 transition-colors',
                    'focus-within:bg-action-background-hover hover:bg-action-background-hover',
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
                    name="details"
                    className={cnTw(
                      'shrink-0 opacity-0 transition-opacity',
                      'focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100',
                    )}
                  />
                </div>
              }
              address={shard.accountId}
              addressPrefix={chain.addressPrefix}
              explorers={chain.explorers || []}
            >
              <ExplorersPopover.Group title={t('general.explorers.derivationTitle')}>
                <HelpText className="break-all text-text-secondary">{accountUtils.getDerivationPath(shard)}</HelpText>
              </ExplorersPopover.Group>
            </ExplorersPopover>
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};
