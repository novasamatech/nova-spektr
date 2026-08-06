export type OperationStep = 'settling' | 'connecting' | 'resolving-path' | 'wrapping' | 'estimating-fee' | 'confirming';

export type OperationBlockReasonKind =
  | 'network-disabled'
  | 'network-unreachable'
  | 'node-rate-limited'
  // The socket is up but the node stopped answering requests — what throttling
  // looks like from here. Distinct from `network-unreachable` (no socket) and
  // from `internal` (unresolvable state, where "change node" would be nonsense).
  | 'node-unresponsive'
  | 'signing-path-unresolved'
  | 'invalid-call-data'
  | 'no-signatory'
  | 'fee-unavailable'
  | 'internal';

export type OperationBlockReason = {
  kind: OperationBlockReasonKind;
  /** Original error text, when the reason came from a caught failure. */
  detail?: string;
};

// Matched against the lowercased error message. `-32603` is deliberately absent:
// it is the generic JSON-RPC "Internal error" code and means nothing on its own.
const RATE_LIMIT_MARKERS = ['too many requests', 'rate limit', 'rate-limit'];

const DISCONNECT_MARKERS = [
  'websocket is not connected',
  'abnormal closure',
  'disconnected from',
  'connection closed',
  'socket hang up',
  // WsProvider's own pending-request timeout, e.g. "No response received from RPC endpoint in 60s".
  'no response received',
  'timeout',
  'timed out',
];

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return String(error ?? '');
}

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

  if (step === 'estimating-fee') {
    return { kind: 'fee-unavailable', detail };
  }

  return { kind: 'internal', detail };
}
