import { type PropsWithChildren } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { Modal } from '@/shared/ui-kit';
import { Button } from '../../Buttons';
import { type Pallet } from '../../Buttons/common/types';

type Props = {
  isOpen: boolean;
  contentClass?: string;
  panelClass?: string;
  confirmText?: string;
  cancelText?: string;
  confirmPallet?: Pallet;
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
  confirmPallet,
  onClose,
  onConfirm,
}: PropsWithChildren<Props>) => (
  <Modal size="fit" isOpen={isOpen} onToggle={(open) => !open && onClose()}>
    <Modal.Content>
      <div className={cnTw('p-4', panelClass, contentClass)}>
        {children}
        <div className="mt-4 flex gap-x-3">
          {cancelText && (
            <Button className="flex-1" variant="fill" pallet="secondary" size="sm" onClick={onClose}>
              {cancelText}
            </Button>
          )}
          {confirmText && (
            <Button className="flex-1" variant="fill" size="sm" pallet={confirmPallet} onClick={onConfirm}>
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </Modal.Content>
  </Modal>
);
