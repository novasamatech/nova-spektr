import { PropsWithChildren } from 'react';

import { Button } from '@renderer/components/ui';
import BaseModal from '../BaseModal/BaseModal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmModal = ({ isOpen, children, onClose, onConfirm }: PropsWithChildren<Props>) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      {children}
      <div className="grid grid-cols-2 gap-x-3">
        <Button variant="outline" pallet="primary" onClick={() => onClose()}>
          Cancel
        </Button>
        <Button variant="fill" pallet="primary" onClick={() => onConfirm()}>
          Confirm
        </Button>
      </div>
    </BaseModal>
  );
};

export default ConfirmModal;
