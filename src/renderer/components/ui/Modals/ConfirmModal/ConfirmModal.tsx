import { PropsWithChildren } from 'react';

import { Button } from '@renderer/components/ui';
import { ViewColor, ViewType } from '@renderer/components/ui/Button/Button';
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
        <Button view={[ViewType.Outline, ViewColor.Primary]} onClick={() => onClose()}>
          Cancel
        </Button>
        <Button view={[ViewType.Fill, ViewColor.Primary]} onClick={() => onConfirm()}>
          Confirm
        </Button>
      </div>
    </BaseModal>
  );
};

export default ConfirmModal;
