export type DescriptionAreaState = 'field' | 'reconnect' | 'hidden';

export type DescriptionAreaInput = {
  /** Active wallet is a (regular or flexible) multisig. */
  isMultisig: boolean;
  /** A draft-creation flow is active — drafts carry their own description. */
  isDraftActive: boolean;
  /** Address-book connection is healthy (auth alive, sync not errored). */
  isHealthy: boolean;
  /** At least one of the active multisig accountIds is in the address book. */
  isInAddressBook: boolean;
  /** User has connected to an address book at least once. */
  hasEverConnected: boolean;
};

/**
 * Decides what the operation-description area renders on an initiation confirm
 * screen. Descriptions are a multisig concept posted to the external address
 * book, so:
 *
 * - `field` — connected, and this multisig is registered there.
 * - `reconnect` — disconnected but the user has connected before; we can't verify
 *   per-multisig membership while offline, so any multisig gets the reconnect
 *   affordance (coarse gate).
 * - `hidden` — not a multisig, during a draft flow, or never connected.
 */
export function resolveDescriptionAreaState(input: DescriptionAreaInput): DescriptionAreaState {
  if (!input.isMultisig || input.isDraftActive) return 'hidden';
  if (input.isHealthy) return input.isInAddressBook ? 'field' : 'hidden';

  return input.hasEverConnected ? 'reconnect' : 'hidden';
}
