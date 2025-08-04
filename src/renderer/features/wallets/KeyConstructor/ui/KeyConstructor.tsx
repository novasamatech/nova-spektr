import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { type DraftAccount, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { constructorModel } from '../model/constructor-model';

import { KeyForm } from './KeyForm';
import { KeysList } from './KeysList';
import { WarningModal } from './WarningModal';

type Props = {
  title: string;
  isOpen: boolean;
  existingKeys: DraftAccount<VaultChainAccount | VaultShardAccount>[];
  onClose: () => void;
  onConfirm: (
    keysToAdd: (VaultChainAccount | VaultShardAccount[])[],
    keysToRemove: (VaultChainAccount | VaultShardAccount[])[],
  ) => void;
};

export const KeyConstructor = ({ title, isOpen, existingKeys, onClose, onConfirm }: Props) => {
  const { t } = useI18n();
  const [isWarningOpen, setIsWarningOpen] = useState(false);

  const hasChanged = useUnit(constructorModel.$hasChanged);
  const keysToAdd = useUnit(constructorModel.$keysToAdd);
  const keysToRemove = useUnit(constructorModel.$keysToRemove);

  useEffect(() => {
    if (!isOpen) return;

    constructorModel.events.formInitiated(existingKeys as (VaultChainAccount | VaultShardAccount)[]);
  }, [isOpen]);

  const closeConstructor = () => {
    if (hasChanged) {
      setIsWarningOpen(true);
    } else {
      onClose();
    }
  };

  const confirmConstructor = () => {
    setIsWarningOpen(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} size="lg" height="full" onToggle={closeConstructor}>
      <Modal.Title close>{t('dynamicDerivations.keysConstructor.title', { title })}</Modal.Title>

      <Modal.Content disableScroll>
        <div className="flex h-full flex-col">
          <div className="border-b border-divider px-5 pt-4 pb-6">
            <KeyForm />
          </div>
          <div className="mt-4 flex-1 overflow-y-auto">
            <KeysList />
          </div>
        </div>
      </Modal.Content>

      <Modal.Footer align="end">
        <Button onClick={() => onConfirm(keysToAdd, keysToRemove)}>
          {t('dynamicDerivations.keysConstructor.saveButton')}
        </Button>
      </Modal.Footer>

      <WarningModal isOpen={isWarningOpen} onClose={() => setIsWarningOpen(false)} onConfirm={confirmConstructor} />
    </Modal>
  );
};
