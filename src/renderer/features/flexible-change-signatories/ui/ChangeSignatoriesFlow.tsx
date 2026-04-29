import { type PropsWithChildren, cloneElement, isValidElement, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { ChangeSignatories } from './ChangeSignatories';

type Props = PropsWithChildren<{
  wallet: Wallet;
  /**
   * Optional controller-override propagated to `<ChangeSignatories>`. Use when
   * the trigger lives next to a specific delegate row so the modal opens on
   * that delegate rather than `flex.multisigAccountId`.
   */
  currentControllerAccountId?: AccountId | null;
  onClose?: () => void;
}>;

/**
 * Wrapper around <ChangeSignatories> that preserves the
 * trigger-renders-children contract used by callers (FlexibleWalletDetails,
 * wallet-details dropdown).
 *
 * The trust-vs-verified picker now lives on the SELECT_CONTROLLER step via
 * <ExecutionModeToggle>; the Confirm step shows it read-only via
 * <ExecutionModeSummary>.
 */
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

  // We render the consumer-supplied trigger element here and inject our `onClick`
  // — same pattern the old picker used. If a consumer passes a non-element child
  // (string / null / fragment), we just render it as-is and rely on `launchOpen`
  // never firing.
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
