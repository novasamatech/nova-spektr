import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { BaseModal, Button } from '@shared/ui';
import { KeyForm } from './KeyForm';
import { KeysList } from './KeysList';
import { WarningModal } from './WarningModal';
import { constructorModel } from '../model/constructor-model';
import { ChainAccount, ShardAccount } from '@shared/core';
import { useI18n } from '@app/providers';

type Props = {
  title: string;
  existingKeys: Array<ChainAccount | ShardAccount[]>;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (keys: Array<ChainAccount | ShardAccount[]>) => void;
};

export const KeyConstructor = ({ title, existingKeys, isOpen, onClose, onConfirm }: Props) => {
  const { t } = useI18n();
  const [isWarningOpen, setIsWarningOpen] = useState(false);

  const hasChanged = useUnit(constructorModel.$hasChanged);
  const keys = useUnit(constructorModel.$keys);

  useEffect(() => {
    constructorModel.events.formInitiated(existingKeys);
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
        <Button onClick={() => onConfirm(keys)}>{t('dynamicDerivations.constructor.saveButton')}</Button>
      </div>

      <WarningModal isOpen={isWarningOpen} onClose={() => setIsWarningOpen(false)} onConfirm={confirmConstructor} />
    </BaseModal>
  );
};
