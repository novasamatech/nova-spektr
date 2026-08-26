import { type AccountId } from '@/shared/polkadotjs-schemas';

export type OperationStep =
  | 'connecting'
  | 'resolving-path'
  | 'wrapping'
  | 'estimating-fee'
  | 'confirming'
  | 'validating';

export type OperationBlockReasonKind =
  | 'network-disabled'
  | 'network-unreachable'
  | 'node-rate-limited'
  // The socket is up but the node stopped answering requests — what throttling
  // looks like from here. Distinct from `network-unreachable` (no socket) and
  // from `internal` (unresolvable state, where "change node" would be nonsense).
  | 'node-unresponsive'
  // The saved path can't be re-resolved against the local wallets. `accountId`
  // names the first missing account when the resolver knows it.
  | 'signing-path-unresolved'
  // The draft carries no usable path at all (legacy draft) — nothing local fixes it.
  | 'signing-path-missing'
  | 'invalid-call-data'
  | 'no-signatory'
  | 'fee-unavailable'
  | 'internal';

export type OperationBlockReason = {
  kind: OperationBlockReasonKind;
  /** Original error text, when the reason came from a caught failure. */
  detail?: string;
  /**
   * For `signing-path-unresolved`: the path account that has no local
   * counterpart.
   */
  accountId?: AccountId;
};

/**
 * Reasons that a reconnect or a fresh node can clear. Everything else is a
 * local, deterministic verdict that retrying against the network cannot
 * change.
 */
const NETWORK_BLOCK_KINDS: ReadonlySet<OperationBlockReasonKind> = new Set([
  'network-unreachable',
  'node-rate-limited',
  'node-unresponsive',
  'fee-unavailable',
]);

export function isNetworkBlockReason(reason: OperationBlockReason): boolean {
  return NETWORK_BLOCK_KINDS.has(reason.kind);
}

// Matched against the lowercased error message. `-32603` is deliberately absent:
// it is the generic JSON-RPC "Internal error" code and means nothing on its own.
const RATE_LIMIT_MARKERS = ['too many requests', 'rate limit', 'rate-limit'];

const DISCONNECT_MARKERS = [
  'websocket is not connected',
  'abnormal closure',
  'disconnected from',
  'connection closed',
  'socket hang up',
];

// The socket was up and the request went out, but nothing came back. Matches
// WsProvider's own pending-request timeout ("No response received from RPC
// endpoint in 60s") and the usual "request timed out" phrasings. Deliberately
// not a bare "timeout": that word shows up in unrelated messages (mortality,
// tx pool) and would misfile them as a silent node.
const NODE_UNRESPONSIVE_MARKERS = ['no response received', 'timed out', 'request timeout'];

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return String(error ?? '');
}

/**
 * Maps a caught RPC/step failure onto a block reason by inspecting the error
 * message: rate limiting and disconnects are recognised by well-known markers,
 * a silent node by its timeout phrasings; anything else is `fee-unavailable`
 * for the fee step and `internal` otherwise. The raw message is carried as
 * `detail` for console diagnostics only.
 */
export function classifyRpcError(error: unknown, step: OperationStep): OperationBlockReason {
  const raw = extractErrorMessage(error);
  const detail = raw || undefined;
  const message = raw.toLowerCase();

  if (RATE_LIMIT_MARKERS.some((marker) => message.includes(marker))) {
    return { kind: 'node-rate-limited', detail };
  }

  if (DISCONNECT_MARKERS.some((marker) => message.includes(marker))) {
    return { kind: 'network-unreachable', detail };
  }

  if (NODE_UNRESPONSIVE_MARKERS.some((marker) => message.includes(marker))) {
    return { kind: 'node-unresponsive', detail };
  }

  if (step === 'estimating-fee') {
    return { kind: 'fee-unavailable', detail };
  }

  return { kind: 'internal', detail };
}
