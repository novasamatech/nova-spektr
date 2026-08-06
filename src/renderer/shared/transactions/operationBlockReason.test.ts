import { describe, expect, it } from 'vitest';

import { classifyRpcError } from './operationBlockReason';

describe('classifyRpcError', () => {
  it('classifies OnFinality rate limiting', () => {
    const error = new Error(
      '-32603: Too Many Requests, Please apply on OnFinality API key or contact us to receive a higher rate limit',
    );

    expect(classifyRpcError(error, 'wrapping')).toEqual({ kind: 'node-rate-limited' });
  });

  it('classifies a dropped websocket', () => {
    expect(classifyRpcError(new Error('WebSocket is not connected'), 'wrapping')).toEqual({
      kind: 'network-unreachable',
    });
  });

  it('classifies an abnormal closure', () => {
    expect(
      classifyRpcError(new Error('disconnected from wss://westend-rpc: 1006:: Abnormal Closure'), 'wrapping'),
    ).toEqual({ kind: 'network-unreachable' });
  });

  it('does not treat a bare -32603 internal error as rate limiting', () => {
    const result = classifyRpcError(new Error('-32603: Internal error'), 'wrapping');

    expect(result.kind).toBe('internal');
  });

  it('falls back to fee-unavailable when the fee step fails for an unknown reason', () => {
    expect(classifyRpcError(new Error('Unable to retrieve fee'), 'estimating-fee')).toEqual({
      kind: 'fee-unavailable',
    });
  });

  it('falls back to internal for unknown failures on other steps', () => {
    expect(classifyRpcError(new Error('boom'), 'wrapping')).toEqual({ kind: 'internal', detail: 'boom' });
  });

  it('tolerates non-Error values', () => {
    expect(classifyRpcError(undefined, 'wrapping').kind).toBe('internal');
  });
});
