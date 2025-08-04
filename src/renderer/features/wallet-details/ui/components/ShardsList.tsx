import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { toAddress } from '@/shared/lib/utils';
import { HelpText } from '@/shared/ui';
import { AccountExplorers, Address } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { accountUtils } from '@/entities/wallet';
import { vaultDetailsModel } from '../../model/vault-details-model';

export const ShardsList = () => {
  const { t } = useI18n();

  const shards = useUnit(vaultDetailsModel.$shards);
  const chain = useUnit(vaultDetailsModel.$chain);

  const [isModalOpen, closeModal] = useModalClose(shards.length > 0, vaultDetailsModel.events.shardsCleared);

  return (
    <Modal isOpen={isModalOpen} size="md" height="lg" onToggle={closeModal}>
      <Modal.Title close>{t('walletDetails.vault.shardsTitle')}</Modal.Title>
      <Modal.Content>
        <ul className="flex max-h-[530px] flex-col gap-y-2 overflow-y-auto px-3">
          {shards.map(shard => (
            <li key={shard.accountId}>
              <div className="group flex w-full items-center justify-between gap-x-1 rounded-sm px-2 py-1.5 transition-colors">
                <div className="w-[370px]">
                  <Address
                    address={toAddress(shard.accountId, { prefix: chain.addressPrefix })}
                    showIcon
                    iconSize={20}
                    variant="truncate"
                  />
                </div>
                <AccountExplorers accountId={shard.accountId} chain={chain}>
                  <HelpText className="text-xs font-normal text-text-tertiary">
                    {t('general.explorers.derivationTitle')}
                  </HelpText>
                  <HelpText className="break-all text-text-secondary">{accountUtils.getDerivationPath(shard)}</HelpText>
                </AccountExplorers>
              </div>
            </li>
          ))}
        </ul>
      </Modal.Content>
    </Modal>
  );
};
