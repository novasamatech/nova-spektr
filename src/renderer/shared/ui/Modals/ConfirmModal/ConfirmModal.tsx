import { type PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';
import { Button } from '@shared/ui';

import { type Pallet } from '../../Buttons/common/types';
import { BaseModal } from '../BaseModal/BaseModal';

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
  <BaseModal
    isOpen={isOpen}
    panelClass={panelClass}
    contentClass={cnTw('p-4', contentClass)}
    zIndex="z-[60]"
    onClose={onClose}
  >
    {children}
    <div className="flex gap-x-3 mt-4">
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
  </BaseModal>
);
