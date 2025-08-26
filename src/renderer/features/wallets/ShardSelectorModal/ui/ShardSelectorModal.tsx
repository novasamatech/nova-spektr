import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
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
    <Modal size="md" isOpen={isModalOpen} onToggle={() => shardsModel.events.shardsConfirmed()}>
      <Modal.Title close>{t('balances.accountsModalTitle')}</Modal.Title>
      <Modal.Content>
        <Box gap={5} padding={[4, 5]}>
          <ShardSearch />
          <ShardsStructure />
        </Box>
      </Modal.Content>
      <Modal.Footer>
        <Button onClick={() => shardsModel.events.shardsConfirmed()}>{t('balances.saveShardsButton')}</Button>
      </Modal.Footer>
    </Modal>
  );
};
