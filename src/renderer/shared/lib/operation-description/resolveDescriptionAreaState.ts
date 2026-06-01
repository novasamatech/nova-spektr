export type DescriptionAreaState = 'field' | 'reconnect' | 'error' | 'hidden';

export type DescriptionAreaInput = {
  /** Active wallet is a (regular or flexible) multisig. */
  isMultisig: boolean;
  /** A draft-creation flow is active — drafts carry their own description. */
  isDraftActive: boolean;
  /** Caller holds the `operation:write` permission (may post descriptions). */
  hasWritePermission: boolean;
  /** Address-book connection is healthy (auth alive, sync not errored). */
  isHealthy: boolean;
  /** At least one of the active multisig accountIds is in the address book. */
  isInAddressBook: boolean;
  /** User has connected to an address book at least once. */
  hasEverConnected: boolean;
};

/**
 * Decides what the operation-description area renders. Descriptions are posted
 * to the external address book (`POST /operations`), which authorizes by:
 * holding `operation:write`, and the multisig existing as a reachable contact.
 */
export function resolveDescriptionAreaState(input: DescriptionAreaInput): DescriptionAreaState {
  if (!input.isMultisig || input.isDraftActive) return 'hidden';

  if (input.isHealthy) {
    if (!input.hasWritePermission) return 'hidden';

    return input.isInAddressBook ? 'field' : 'error';
  }

  return input.hasEverConnected ? 'reconnect' : 'hidden';
}
