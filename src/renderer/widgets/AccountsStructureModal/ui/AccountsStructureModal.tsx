import { useCallback, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';

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
        <div className="flex h-full flex-col">
          <div className="mb-4 flex-1 rounded-lg bg-gray-100 p-4">
            <div className="flex h-full items-center justify-center text-gray-500">
              {t('Accounts structure content will be displayed here')}
            </div>
          </div>
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
