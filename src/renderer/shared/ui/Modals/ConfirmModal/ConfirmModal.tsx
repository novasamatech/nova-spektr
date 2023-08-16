import { PropsWithChildren } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { Button } from '../../Buttons';
import { BaseModal } from '../BaseModal/BaseModal';

type Props = {
  isOpen: boolean;
  contentClass?: string;
  panelClass?: string;
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export const ConfirmModal = ({
  isOpen,
  children,
  contentClass,
  panelClass,
  confirmText,
  cancelText,
  onClose,
  onConfirm,
}: PropsWithChildren<Props>) => (
  <BaseModal isOpen={isOpen} panelClass={panelClass} contentClass={cnTw('p-4', contentClass)} onClose={onClose}>
    {children}
    <div className="flex gap-x-3 mt-4">
      {cancelText && (
        <Button className="flex-1" variant="text" size="sm" onClick={onClose}>
          {cancelText}
        </Button>
      )}
      {confirmText && (
        <Button className="flex-1" variant="fill" size="sm" onClick={onConfirm}>
          {confirmText}
        </Button>
      )}
    </div>
  </BaseModal>
);
