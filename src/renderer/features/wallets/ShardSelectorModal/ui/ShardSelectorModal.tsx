import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { BaseModal, Button } from '@/shared/ui';
import { type Callbacks, shardsModel } from '../model/shards-model';

import { ShardSearch } from './ShardSearch';
import { ShardsStructure } from './ShardsStructure';

export const ShardSelectorModal = ({ onConfirm }: Callbacks) => {
  const { t } = useI18n();

  const isAccessDenied = useUnit(shardsModel.$isAccessDenied);
  const isModalOpen = useUnit(shardsModel.$isModalOpen);

  useEffect(() => {
    shardsModel.events.callbacksChanged({ onConfirm });
  }, [onConfirm]);

  if (isAccessDenied) {
    return null;
  }

  return (
    <BaseModal
      closeButton
      isOpen={isModalOpen}
      title={t('balances.accountsModalTitle')}
      contentClass="pl-3 pr-0 py-4"
      headerClass="px-5 py-4"
      onClose={shardsModel.events.shardsConfirmed}
    >
      <div className="mb-4 ml-2 mr-5">
        <ShardSearch />
      </div>
      <ShardsStructure />

      <Button className="ml-auto mr-5 mt-7" onClick={() => shardsModel.events.shardsConfirmed()}>
        {t('balances.saveShardsButton')}
      </Button>
    </BaseModal>
  );
};
