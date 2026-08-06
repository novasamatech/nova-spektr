import { describe, expect, it } from 'vitest';

import { classifyRpcError } from './operationBlockReason';

describe('classifyRpcError', () => {
  it('classifies OnFinality rate limiting', () => {
    const error = new Error(
      '-32603: Too Many Requests, Please apply on OnFinality API key or contact us to receive a higher rate limit',
    );

    expect(classifyRpcError(error, 'wrapping')).toEqual({
      kind: 'node-rate-limited',
      detail:
        '-32603: Too Many Requests, Please apply on OnFinality API key or contact us to receive a higher rate limit',
    });
  });

  it('classifies a dropped websocket', () => {
    expect(classifyRpcError(new Error('WebSocket is not connected'), 'wrapping')).toMatchObject({
      kind: 'network-unreachable',
    });
  });

  it('classifies an abnormal closure', () => {
    expect(
      classifyRpcError(new Error('disconnected from wss://westend-rpc: 1006:: Abnormal Closure'), 'wrapping'),
    ).toEqual({
      kind: 'network-unreachable',
      detail: 'disconnected from wss://westend-rpc: 1006:: Abnormal Closure',
    });
  });

  it('classifies an RPC request timeout', () => {
    expect(classifyRpcError(new Error('No response received from RPC endpoint in 60s'), 'wrapping')).toMatchObject({
      kind: 'network-unreachable',
    });
  });

  it('does not treat a bare -32603 internal error as rate limiting', () => {
    const result = classifyRpcError(new Error('-32603: Internal error'), 'wrapping');

    expect(result.kind).toBe('internal');
  });

  it('falls back to fee-unavailable when the fee step fails for an unknown reason', () => {
    expect(classifyRpcError(new Error('Unable to retrieve fee'), 'estimating-fee')).toEqual({
      kind: 'fee-unavailable',
      detail: 'Unable to retrieve fee',
    });
  });

  it('falls back to internal for unknown failures on other steps', () => {
    expect(classifyRpcError(new Error('boom'), 'wrapping')).toEqual({ kind: 'internal', detail: 'boom' });
  });

  it('tolerates non-Error values', () => {
    expect(classifyRpcError(undefined, 'wrapping')).toEqual({ kind: 'internal' });
  });

  it('reads the message off an object-shaped error', () => {
    expect(classifyRpcError({ message: 'WebSocket is not connected' }, 'wrapping')).toMatchObject({
      kind: 'network-unreachable',
    });
  });

  it.each([
    ['too many requests', 'node-rate-limited'],
    ['rate limit', 'node-rate-limited'],
    ['rate-limit', 'node-rate-limited'],
    ['websocket is not connected', 'network-unreachable'],
    ['abnormal closure', 'network-unreachable'],
    ['disconnected from', 'network-unreachable'],
    ['connection closed', 'network-unreachable'],
    ['socket hang up', 'network-unreachable'],
    ['no response received', 'network-unreachable'],
    ['timeout', 'network-unreachable'],
    ['timed out', 'network-unreachable'],
  ] as const)('classifies "%s" as %s', (marker, kind) => {
    expect(classifyRpcError(new Error(marker), 'wrapping').kind).toBe(kind);
  });
});
