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
 * Decides what the operation-description area renders on an initiation confirm
 * screen. Descriptions are a multisig concept posted to the external address
 * book (`POST /operations`), which the backend authorizes by: holding
 * `operation:write`, the multisig existing as a reachable contact. We mirror
 * that authorization client-side so the user never hits a guaranteed 400/403:
 *
 * - `field` — connected, has write permission, and this multisig is a reachable
 *   contact → the POST will succeed.
 * - `error` — connected and has write permission, but the multisig is NOT in the
 *   address book → the backend would answer 400 (unknown multisig) or 403 (not
 *   reachable). We surface an inline error instead of a dead input.
 * - `reconnect` — disconnected but the user has connected before; we can't verify
 *   per-multisig membership (or permission) while offline, so any multisig gets
 *   the reconnect affordance (coarse gate). Re-evaluates after reconnect.
 * - `hidden` — not a multisig, during a draft flow, lacking `operation:write`
 *   while connected, or never connected.
 *
 * The permission gate is applied only on the healthy branch, where `$authState`
 * (hence the permission list) is guaranteed present — offline it isn't
 * reliable.
 */
export function resolveDescriptionAreaState(input: DescriptionAreaInput): DescriptionAreaState {
  if (!input.isMultisig || input.isDraftActive) return 'hidden';

  if (input.isHealthy) {
    if (!input.hasWritePermission) return 'hidden';

    return input.isInAddressBook ? 'field' : 'error';
  }

  return input.hasEverConnected ? 'reconnect' : 'hidden';
}
