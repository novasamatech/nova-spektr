import { type PropsWithChildren, cloneElement, isValidElement, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { ChangeSignatories } from './ChangeSignatories';

type Props = PropsWithChildren<{
  wallet: Wallet;
  currentControllerAccountId?: AccountId | null;
  onClose?: () => void;
}>;

export const ChangeSignatoriesFlow = ({ wallet, currentControllerAccountId, onClose, children }: Props) => {
  const [open, setOpen] = useState(false);
  const [flowKey, setFlowKey] = useState(0);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const handleOpen = () => {
    setFlowKey((k) => k + 1);
    setOpen(true);
  };

  const trigger = isValidElement<{ onClick?: () => void }>(children)
    ? cloneElement(children, { onClick: handleOpen })
    : children;

  return (
    <>
      {trigger}
      {open && (
        <ChangeSignatories
          key={flowKey}
          wallet={wallet}
          currentControllerAccountId={currentControllerAccountId}
          hideTrigger
          launchOpen
          onClose={handleClose}
        >
          {null}
        </ChangeSignatories>
      )}
    </>
  );
};
