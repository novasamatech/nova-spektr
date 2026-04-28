import { type PropsWithChildren, cloneElement, isValidElement, useState } from 'react';

import { type Wallet } from '@/shared/core';

import { ChangeSignatories } from './ChangeSignatories';

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClose?: () => void;
  /**
   * Reserved for future use — Task 11 (ProxyDetails entry-point) may pass
   * `false` when the user has no permission to use the verified proxy path.
   * Currently unused; the front-of-flow mode picker has been removed and the
   * execution mode is selected on the Confirm step instead.
   */
  canUseVerifiedPath?: boolean;
}>;

/**
 * Wrapper around <ChangeSignatories> that preserves the
 * trigger-renders-children contract used by callers (FlexibleWalletDetails,
 * wallet-details dropdown).
 *
 * The previous front-of-flow trust-vs-verified picker has been removed — that
 * decision now lives on the Confirm step via <ExecutionModeToggle>.
 */
export const ChangeSignatoriesFlow = ({ wallet, onClose, children }: Props) => {
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
        <ChangeSignatories key={flowKey} wallet={wallet} hideTrigger launchOpen onClose={handleClose}>
          {null}
        </ChangeSignatories>
      )}
    </>
  );
};
