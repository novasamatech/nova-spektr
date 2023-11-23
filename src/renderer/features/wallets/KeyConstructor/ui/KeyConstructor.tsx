import { useUnit } from 'effector-react';

import { BaseModal, Button } from '@shared/ui';
import { KeyForm } from './KeyForm';
import { KeysList } from './KeysList';
import { WarningModal } from './WarningModal';
import { constructorModel } from '../model/constructor-model';
import { useToggle } from '@shared/lib/hooks';
import { ChainAccount, ShardAccount } from '@shared/core';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (keys: Array<ChainAccount | ShardAccount[]>) => void;
};

export const KeyConstructor = ({ isOpen, onClose, onConfirm }: Props) => {
  const [isWarningOpen, toggleWarningOpen] = useToggle();

  const hasChanged = useUnit(constructorModel.$hasChanged);
  const keys = useUnit(constructorModel.$keys);

  const closeConstructor = () => {
    if (!hasChanged) onClose();

    toggleWarningOpen();
  };

  const confirmConstructor = () => {
    toggleWarningOpen();
    onConfirm(keys);
  };

  return (
    <BaseModal
      closeButton
      contentClass="flex flex-col h-[calc(100%-46px)]"
      panelClass="w-[784px] h-[678px]"
      title="Add keys for My Novasama vault"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="px-5 pt-4 pb-6 border-b border-divider">
        <KeyForm />
      </div>
      <div className="flex-1 mt-4 overflow-y-auto">
        <KeysList />
      </div>
      <div className="flex justify-between pt-3 px-5 pb-4">
        <Button variant="text" onClick={closeConstructor}>
          Back
        </Button>
        <Button onClick={() => onConfirm(keys)}>Save</Button>
      </div>

      <WarningModal isOpen={isWarningOpen} onClose={toggleWarningOpen} onConfirm={confirmConstructor} />
    </BaseModal>
  );
};
