import { PropsWithChildren } from 'react';
import cn from 'classnames';

import { Button } from '@renderer/components/ui';
import BaseModal from '../BaseModal/BaseModal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  className?: string;
  confirmText?: string;
  cancelText?: string;
};

const ConfirmModal = ({
  isOpen,
  children,
  onClose,
  onConfirm,
  className,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: PropsWithChildren<Props>) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className={cn('p-5', className)}>
      {children}
      <div className="grid grid-cols-2 gap-x-3">
        <Button variant="outline" pallet="primary" onClick={() => onClose()}>
          {cancelText}
        </Button>
        <Button variant="fill" pallet="primary" onClick={() => onConfirm()}>
          {confirmText}
        </Button>
      </div>
    </BaseModal>
  );
};

export default ConfirmModal;
