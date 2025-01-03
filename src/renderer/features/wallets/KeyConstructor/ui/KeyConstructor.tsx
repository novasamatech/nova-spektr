import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { type DraftAccount, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BaseModal, Button } from '@/shared/ui';
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
    <BaseModal
      closeButton
      contentClass="flex flex-col h-[calc(100%-46px)]"
      panelClass="w-[784px] h-[678px]"
      title={t('dynamicDerivations.constructor.title', { title })}
      isOpen={isOpen}
      onClose={closeConstructor}
    >
      <div className="border-b border-divider px-5 pb-6 pt-4">
        <KeyForm />
      </div>
      <div className="mt-4 flex-1 overflow-y-auto">
        <KeysList />
      </div>
      <div className="flex justify-between px-5 pb-4 pt-3">
        <Button variant="text" onClick={closeConstructor}>
          {t('dynamicDerivations.constructor.backButton')}
        </Button>
        <Button onClick={() => onConfirm(keysToAdd, keysToRemove)}>
          {t('dynamicDerivations.constructor.saveButton')}
        </Button>
      </div>

      <WarningModal isOpen={isWarningOpen} onClose={() => setIsWarningOpen(false)} onConfirm={confirmConstructor} />
    </BaseModal>
  );
};
