import '@xyflow/react/dist/style.css';

import { useCallback, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';

import { AccountsStructure } from './AccountsStructure';

type Props = {
  onClose?: () => void;
};

export const AccountsStructureModal = ({ onClose }: Props) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const onToggle = useCallback(
    (value: boolean) => {
      setIsOpen(value);

      if (!value) {
        onClose?.();
      }
    },
    [onClose],
  );

  return (
    <Modal size="lg" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Title close>{t('accountsStructure.modalTitle')}</Modal.Title>
      <Modal.Content>
        <div className="h-[600px]">
          <AccountsStructure />
        </div>
      </Modal.Content>
      <Modal.Trigger>
        <Button pallet="secondary" size="sm" variant="fill">
          {t('accountsStructure.button')}
        </Button>
      </Modal.Trigger>
    </Modal>
  );
};
