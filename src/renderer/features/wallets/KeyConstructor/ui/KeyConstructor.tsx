import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@app/providers';
import { type ChainAccount, type DraftAccount, type ShardAccount } from '@shared/core';
import { BaseModal, Button } from '@shared/ui';
import { constructorModel } from '../model/constructor-model';

import { KeyForm } from './KeyForm';
import { KeysList } from './KeysList';
import { WarningModal } from './WarningModal';

type Props = {
  title: string;
  isOpen: boolean;
  existingKeys: DraftAccount<ChainAccount | ShardAccount>[];
  onClose: () => void;
  onConfirm: (
    keysToAdd: Array<ChainAccount | ShardAccount[]>,
    keysToRemove: Array<ChainAccount | ShardAccount[]>,
  ) => void;
};

export const KeyConstructor = ({ title, isOpen, existingKeys, onClose, onConfirm }: Props) => {
  const { t } = useI18n();
  const [isWarningOpen, setIsWarningOpen] = useState(false);

  const hasChanged = useUnit(constructorModel.$hasChanged);
  const keysToAdd = useUnit(constructorModel.$keysToAdd);
  const keysToRemove = useUnit(constructorModel.$keysToRemove);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    constructorModel.events.formInitiated(existingKeys as Array<ChainAccount | ShardAccount>);
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
      <div className="px-5 pt-4 pb-6 border-b border-divider">
        <KeyForm />
      </div>
      <div className="flex-1 mt-4 overflow-y-auto">
        <KeysList />
      </div>
      <div className="flex justify-between pt-3 px-5 pb-4">
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
