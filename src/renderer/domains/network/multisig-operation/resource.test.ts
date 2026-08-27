import { type ApiPromise } from '@polkadot/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ChainId, type HexString } from '@/shared/core';
import { getCallHash } from '@/shared/lib/utils';
import { polkadotChain, polkadotChainId } from '@/shared/mocks';

import { mapSubqueryOperationRecord } from './resource';

const decoder = vi.hoisted(() => ({
  decodeCallData: vi.fn(),
  extractSectionMethodFromCallData: vi.fn(),
}));

vi.mock('@/entities/transaction/lib/callDataDecoder', () => decoder);

vi.mock('../transaction/service', () => ({
  transactionService: { getCoreCallData: () => null },
}));

const callData = '0x0500' as HexString;
const callHash = getCallHash(callData);

const api = { genesisHash: { toHex: () => polkadotChainId } } as unknown as ApiPromise;
const apis = { [polkadotChainId]: api };
const chains = { [polkadotChainId]: polkadotChain };

const makeNode = (overrides: Record<string, unknown> = {}) => ({
  status: 'executed',
  accountId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  chainId: polkadotChainId,
  callHash,
  callData,
  depositor: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  blockCreated: 10,
  indexCreated: 1,
  timestamp: 1700000000,
  method: 'transfer',
  section: 'balances',
  events: { nodes: [] },
  ...overrides,
});

describe('mapSubqueryOperationRecord', () => {
  beforeEach(() => {
    decoder.decodeCallData.mockReset().mockReturnValue({ section: 'balances', method: 'transfer', args: {} });
    decoder.extractSectionMethodFromCallData.mockReset().mockReturnValue(null);
  });

  it('keeps call data whose hash matches and sets no mismatch flag', () => {
    const operation = mapSubqueryOperationRecord(makeNode(), apis, chains);

    expect(operation?.callData).toBe(callData);
    expect(operation?.transaction).not.toBeNull();
    expect(operation?.callDataMismatch).toBeUndefined();
  });

  it('discards call data whose hash does not match and flags the mismatch', () => {
    const operation = mapSubqueryOperationRecord(makeNode({ callHash: '0xdeadbeef' }), apis, chains);

    expect(operation?.callData).toBeNull();
    expect(operation?.transaction).toBeNull();
    expect(operation?.callDataMismatch).toBe(true);
  });

  it('ignores the indexer section/method on a mismatch — they describe the discarded data', () => {
    const operation = mapSubqueryOperationRecord(makeNode({ callHash: '0xdeadbeef' }), apis, chains);

    expect(operation?.section).toBeNull();
    expect(operation?.method).toBeNull();
  });

  it('falls back to the indexer section/method when the call data decodes but is absent', () => {
    const operation = mapSubqueryOperationRecord(makeNode({ callData: null }), apis, chains);

    expect(operation?.section).toBe('balances');
    expect(operation?.method).toBe('transfer');
  });

  it('recovers section/method only from validated call data when full decoding throws', () => {
    decoder.decodeCallData.mockImplementation(() => {
      throw new Error('nested batch');
    });
    decoder.extractSectionMethodFromCallData.mockReturnValue({ section: 'utility', method: 'batchAll' });

    const operation = mapSubqueryOperationRecord(makeNode({ section: null, method: null }), apis, chains);

    expect(decoder.extractSectionMethodFromCallData).toHaveBeenCalledTimes(1);
    expect(decoder.extractSectionMethodFromCallData).toHaveBeenCalledWith(api, callData);
    expect(operation?.section).toBe('utility');
    expect(operation?.method).toBe('batchAll');
  });

  it('never hands mismatching call data to the section/method recovery path', () => {
    decoder.decodeCallData.mockImplementation(() => {
      throw new Error('should not decode');
    });

    const operation = mapSubqueryOperationRecord(makeNode({ callHash: '0xdeadbeef' }), apis, chains);

    expect(decoder.decodeCallData).not.toHaveBeenCalled();
    expect(decoder.extractSectionMethodFromCallData).not.toHaveBeenCalled();
    expect(operation?.section).toBeNull();
  });

  it('does not flag a mismatch when the indexer has no call data', () => {
    const operation = mapSubqueryOperationRecord(makeNode({ callData: null }), apis, chains);

    expect(operation?.callData).toBeNull();
    expect(operation?.callDataMismatch).toBeUndefined();
  });

  it('returns null for a chain without an api', () => {
    const operation = mapSubqueryOperationRecord(makeNode({ chainId: '0x00' as ChainId }), apis, chains);

    expect(operation).toBeNull();
  });
});
