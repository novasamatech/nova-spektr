import { PropsWithChildren } from 'react';

import { cnTw } from '@renderer/shared/lib/utils';
import { Button, ButtonText } from '../../Buttons';
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
        <ButtonText className="flex-1" size="sm" onClick={onClose}>
          {cancelText}
        </ButtonText>
      )}
      {confirmText && (
        <Button className="flex-1" size="sm" onClick={onConfirm}>
          {confirmText}
        </Button>
      )}
    </div>
  </BaseModal>
);
