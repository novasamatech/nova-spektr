import { type ApiPromise } from '@polkadot/api';
import { describe, expect, it, vi } from 'vitest';

import { type ChainId, type HexString } from '@/shared/core';
import { getCallHash } from '@/shared/lib/utils';
import { polkadotChain, polkadotChainId } from '@/shared/mocks';

import { mapSubqueryOperationRecord } from './resource';

vi.mock('@/entities/transaction/lib/callDataDecoder', () => ({
  decodeCallData: () => ({ section: 'balances', method: 'transfer', args: {} }),
  extractSectionMethodFromCallData: () => null,
}));

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
