import { type Address } from '@/shared/core';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PathNode =
  | { kind: 'source'; id: string; address: Address; name: string }
  | { kind: 'multisig'; id: string; address: Address; name: string }
  | {
      kind: 'proxied';
      id: string;
      address: Address;
      name: string;
      // 'proxied' variant is reserved for proxy-path support (future task).
      // Don't add UI logic for it here yet; the type is needed so Task 10's
      // wiring can reference it in discriminated unions without a breaking change.
    }
  | { kind: 'signer'; id: string; address: Address; name: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * A signing path is complete when it starts with a 'source' node and ends with
 * a 'signer' node (the leaf wallet that will sign the tx).
 */
export function isComplete(path: PathNode[]): boolean {
  if (path.length < 2) return false;

  const first = path[0];
  const last = path.at(-1);

  return first !== undefined && first.kind === 'source' && last !== undefined && last.kind === 'signer';
}
