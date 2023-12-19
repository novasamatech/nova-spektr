import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { BaseModal, Button } from '@shared/ui';
import { ShardSearch } from './ShardSearch';
import { ShardsStructure } from './ShardsStructure';
import { shardsModel, Callbacks } from '../model/shards-model';
import { useI18n } from '@app/providers';

export const ShardSelectorModal = ({ onConfirm }: Callbacks) => {
  const { t } = useI18n();

  const isAccessDenied = useUnit(shardsModel.$isAccessDenied);
  const isModalOpen = useUnit(shardsModel.$isModalOpen);

  useEffect(() => {
    shardsModel.events.callbacksChanged({ onConfirm });
  }, [onConfirm]);

  if (isAccessDenied) return null;

  return (
    <BaseModal
      closeButton
      isOpen={isModalOpen}
      title={t('balances.shardsModalTitle')}
      contentClass="pl-3 pr-0 py-4"
      headerClass="px-5 py-4"
      onClose={shardsModel.events.shardsConfirmed}
    >
      <ShardSearch />
      <ShardsStructure />

      <Button className="ml-auto mt-7 mr-5" onClick={() => shardsModel.events.shardsConfirmed()}>
        {t('balances.saveShardsButton')}
      </Button>
    </BaseModal>
  );
};
