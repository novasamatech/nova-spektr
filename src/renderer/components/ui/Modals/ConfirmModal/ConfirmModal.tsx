import { PropsWithChildren } from 'react';
import cn from 'classnames';

import { Button } from '@renderer/components/ui';
import BaseModal from '../BaseModal/BaseModal';

type Props = {
  isOpen: boolean;
  contentClass?: string;
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmModal = ({
  isOpen,
  children,
  onClose,
  onConfirm,
  contentClass,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: PropsWithChildren<Props>) => (
  <BaseModal isOpen={isOpen} contentClass={cn('p-5', contentClass)} onClose={onClose}>
    {children}
    <div className="grid grid-cols-2 gap-x-3">
      <Button variant="fill" pallet="primary" onClick={() => onClose()}>
        {cancelText}
      </Button>
      <Button variant="outline" pallet="error" onClick={() => onConfirm()}>
        {confirmText}
      </Button>
    </div>
  </BaseModal>
);

export default ConfirmModal;
