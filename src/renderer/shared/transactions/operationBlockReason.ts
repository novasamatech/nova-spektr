export type OperationStep = 'settling' | 'connecting' | 'resolving-path' | 'wrapping' | 'estimating-fee' | 'confirming';

export type OperationBlockReason =
  | { kind: 'network-disabled' }
  | { kind: 'network-unreachable' }
  | { kind: 'node-rate-limited' }
  | { kind: 'signing-path-unresolved' }
  | { kind: 'invalid-call-data' }
  | { kind: 'no-signatory' }
  | { kind: 'fee-unavailable' }
  | { kind: 'internal'; detail?: string };

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

export function classifyRpcError(error: unknown, step: OperationStep): OperationBlockReason {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const message = raw.toLowerCase();

  if (RATE_LIMIT_MARKERS.some((marker) => message.includes(marker))) {
    return { kind: 'node-rate-limited' };
  }

  if (DISCONNECT_MARKERS.some((marker) => message.includes(marker))) {
    return { kind: 'network-unreachable' };
  }

  if (step === 'estimating-fee') {
    return { kind: 'fee-unavailable' };
  }

  return { kind: 'internal', detail: raw || 'unknown error' };
}
