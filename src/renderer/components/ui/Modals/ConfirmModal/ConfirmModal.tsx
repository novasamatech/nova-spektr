import { PropsWithChildren } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
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
  contentClass,
  confirmText,
  cancelText,
  onClose,
  onConfirm,
}: PropsWithChildren<Props>) => (
  <BaseModal isOpen={isOpen} contentClass={cnTw('p-5', contentClass)} onClose={onClose}>
    {children}
    <div className="flex gap-x-3">
      {cancelText && (
        <Button className="flex-1" variant="fill" pallet="primary" onClick={onClose}>
          {cancelText}
        </Button>
      )}
      {confirmText && (
        <Button className="flex-1" variant="outline" pallet="error" onClick={onConfirm}>
          {confirmText}
        </Button>
      )}
    </div>
  </BaseModal>
);

export default ConfirmModal;
