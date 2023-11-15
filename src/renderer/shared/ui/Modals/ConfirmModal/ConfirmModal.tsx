import { PropsWithChildren } from 'react';

import { cnTw } from '@shared/lib/utils';
import { Button } from '@shared/ui';
import BaseModal from '../BaseModal/BaseModal';
import { Pallet } from '../../Buttons/common/types';

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

const ConfirmModal = ({
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
  <BaseModal isOpen={isOpen} panelClass={panelClass} contentClass={cnTw('p-4', contentClass)} onClose={onClose}>
    {children}
    <div className="flex gap-x-3 mt-4">
      {cancelText && (
        <Button className="flex-1" variant="text" size="sm" onClick={onClose}>
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

export default ConfirmModal;
